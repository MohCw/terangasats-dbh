"""Builds messages.jsonl. Rows R* are real masked SMS; the others are reconstructed: formats follow
public descriptions of Wave / Orange Money receipts and of the scams reported by the press.
Replace the legit rows with real masked SMS from the team (origin "reel_masque") when available.
Run: python dataset/build.py"""
import json, pathlib

LEGIT = [
  ("OrangeMoney", "Vous avez recu un transfert de 5000.00 FCFA du [NUMERO]. Votre nouveau solde est de [SOLDE]. Ref: CI241101.1023.A12345"),
  ("OrangeMoney", "Transfert de 12500 FCFA recu de [NUMERO] le 02/11/2026 a 09:14. Nouveau solde: [SOLDE]. ID: CI241102.0914.C40112"),
  ("OrangeMoney", "Depot de 20000 FCFA effectue sur votre compte. Ref: PP241103.1201.C55102. Solde: [SOLDE]"),
  ("OrangeMoney", "Vous avez recu 7500 FCFA de [NOM]. Ref: CI241104.1755.D21007. Votre solde est [SOLDE]"),
  ("OrangeMoney", "Paiement marchand recu: 16500 FCFA. Client [NUMERO]. Ref: MP241105.1842.E90031. Solde [SOLDE]"),
  ("OrangeMoney", "Retrait de 10000 FCFA effectue chez votre agent. Frais 100 FCFA. Ref: CO241106.1105.F11210. Solde: [SOLDE]"),
  ("OrangeMoney", "Achat de credit de 1000 FCFA effectue. Ref: RC241106.0812.G00451. Nouveau solde: [SOLDE]"),
  ("OrangeMoney", "Vous avez recu un transfert de 30000.00 FCFA du [NUMERO]. Votre nouveau solde est de [SOLDE]. Ref: CI241107.1530.H33120"),
  ("OrangeMoney", "Transfert recu: 2000 FCFA de [NOM] ([NUMERO]). Ref: CI241108.0701.J00982. Solde: [SOLDE]"),
  ("OrangeMoney", "Depot de 50000 FCFA recu via agent. Ref: PP241108.1645.K72001. Solde: [SOLDE]"),
  ("Wave", "Vous avez reçu 15000F de [NOM]. Nouveau solde: [SOLDE]. Merci d'utiliser Wave."),
  ("Wave", "Vous avez reçu 2500F de [NUMERO]. Solde: [SOLDE]."),
  ("Wave", "Paiement reçu: 16500F de [NOM]. Frais: 0F. Nouveau solde: [SOLDE]."),
  ("Wave", "Vous avez reçu 40000F de [NOM]. Solde: [SOLDE]. Wave, l'argent sans frais."),
  ("Wave", "Dépôt de 10000F reçu. Nouveau solde: [SOLDE]."),
  ("Wave", "Vous avez envoyé 5000F à [NUMERO]. Frais: 50F. Nouveau solde: [SOLDE]."),
  ("Wave", "Vous avez reçu 3000F de [NOM] pour la commande 42. Solde: [SOLDE]."),
  ("Wave", "Paiement de 8000F reçu de [NUMERO]. Solde: [SOLDE]."),
  ("Wave", "Retrait de 20000F effectué. Frais: 200F. Nouveau solde: [SOLDE]."),
  ("Wave", "Vous avez reçu 125000F de [NOM]. Nouveau solde: [SOLDE]."),
  ("FreeMoney", "Free Money: vous avez recu 6000 FCFA du [NUMERO]. Ref FM241101.88213. Solde: [SOLDE]"),
  ("FreeMoney", "Free Money: transfert de 15000 FCFA recu. Ref FM241103.40021. Solde: [SOLDE]"),
  ("FreeMoney", "Free Money: depot de 25000 FCFA effectue. Ref FM241105.10093. Solde: [SOLDE]"),
  ("", "Vous avez recu un transfert de 9000.00 FCFA du [NUMERO]. Votre nouveau solde est de [SOLDE]. Ref: CI241109.1120.L41003"),
  ("", "Vous avez reçu 4500F de [NOM]. Nouveau solde: [SOLDE]."),
  ("", "Transfert de 18000 FCFA recu de [NUMERO]. ID: CI241109.1402.M11234. Nouveau solde: [SOLDE]"),
  ("", "Paiement reçu: 12000F de [NUMERO]. Frais: 0F. Nouveau solde: [SOLDE]."),
  ("", "Depot de 15000 FCFA effectue sur votre compte. Ref: PP241110.0930.N22013. Solde: [SOLDE]"),
  ("", "Vous avez reçu 60000F de [NOM]. Solde: [SOLDE]."),
  ("", "Free Money: vous avez recu 3500 FCFA. Ref FM241110.55120. Solde: [SOLDE]"),
]

FAKE_TRANSFER = [
  ("[NUMERO]", "Vous avez recu un transfert de 135000.00 FCFA du [NUMERO]. Votre nouveau solde est de [SOLDE]. Ref: CI241101.1023.A12345"),
  ("[NUMERO]", "Transfert reçu 250000F. Livrez la commande svp, le client attend."),
  ("[NUMERO]", "Wave: vous avez reçu 85000F de [NOM]. Solde: [SOLDE]."),
  ("OrangeMoney", "Vous avez recu 150000F. Votre solde est [SOLDE]. Remettez la marchandise au client maintenant"),
  ("OrangeMoney", "Transfert recu 90000 FCFA. Ref 000000. Montrez ce message au vendeur pour valider."),
  ("Wave", "Paiement reçu 175000F. Confirmez la livraison au porteur de ce message."),
  ("", "Vous avez reçu 250000F. Votre solde est [SOLDE]. Livrez la marchandise svp le client attend"),
  ("", "Transfert reçu 135000 F. Ref 000. Montrez ce message au vendeur pour valider."),
  ("", "ORANGE MONEY: transfert de 200000 FCFA reussi vers votre compte. Veuillez remettre les articles au livreur."),
  ("", "Paiement validé: 95000F reçu. Ne pas appeler le client, livraison urgente."),
  ("", "Wave: 60000F reçu avec succès. Code de confirmation à donner au livreur: 4471"),
  ("", "Vous avez recu un transfert de 120000.00 FCFA. Votre nouveau solde est de [SOLDE]. Ref: XX000000"),
  ("", "Confirmation de paiement: 300000 F crédités. Merci de livrer immédiatement."),
  ("", "Vous avez reçu 45000F de [NOM]. Nouveau solde: [SOLDE]. Livrez vite svp."),
  ("", "Transaction reussie. Montant 80000 FCFA. Le paiement sera visible dans 24h, vous pouvez livrer."),
]

DEPOSIT_ERROR = [
  ("[NUMERO]", "Bonsoir je me suis trompé de numéro en envoyant 30000F, merci de me renvoyer svp"),
  ("[NUMERO]", "ORANGE MONEY: depot de 50000F effectue par erreur sur votre compte. Merci de renvoyer au [NUMERO] svp sinon blocage"),
  ("[NUMERO]", "Composez le code d'annulation #144*2*5521# pour annuler le depot de 25000F fait par erreur"),
  ("", "Je vous ai envoyé 20000F par mégarde, renvoyez au [NUMERO] svp c'est urgent"),
  ("", "Salam, c'est l'argent de l'école de mon fils que je vous ai envoyé par erreur, 15000F, renvoyez svp"),
  ("", "Wave: un dépôt de 40000F a été fait par erreur. Veuillez rembourser au [NUMERO] sous 1h."),
  ("", "Service client Orange Money: suite à une erreur, composez #144*391*0000# pour valider le retour des fonds"),
  ("", "Vous avez reçu 35000F par erreur. Pour éviter la suspension de votre compte, renvoyez la somme."),
  ("", "Pardon j'ai fait un mauvais numéro, j'ai envoyé 10000. Renvoie moi stp je suis à l'hôpital"),
  ("", "Votre compte a été crédité de 50000F par erreur. Tapez le code 1234 pour annuler l'opération."),
  ("", "Envoyé par erreur 25000F. Merci de me rembourser 24000F, gardez 1000F pour vous."),
  ("OrangeMoney", "Depot de 60000F recu. Ce depot est une erreur, composez le #144*4*6# pour le retourner."),
  ("Wave", "Vous avez reçu 18000F. Erreur de destinataire: renvoyez immédiatement au [NUMERO]."),
  ("", "Bonjour, l'argent que vous avez reçu ne vous est pas destiné. Renvoyez-le au [NUMERO] svp"),
  ("", "Remboursez les 45000F reçus ce matin, c'était une erreur de ma part, merci"),
]

# Real SMS from the team, masked with core/mask.ts; transaction references replaced by same-format dummies.
REAL = [
  ("OrangeMoney", "Vous avez recu un transfert de 30000.00FCFA de [NUMERO] [NOM]. Ref:PP261114.0930.C10427 .Votre solde[SOLDE].Merci.OFMS"),
  ("OrangeMoney", "Votre transfert de 30000.00Fcfa vers [NUMERO] [NOM] a reussi. Frais d'envoi:0.00Fcfa. Solde: [SOLDE].Ref:PP261114.0930.C10427 . Merci.OFMS"),
  ("Wave", "Vous avez recu 2.000F\nDe [NOM] ([NUMERO])\n11/11/2026 à 19h33\nNouveau solde: [SOLDE] \n+infos: 200600\nAvec WDF\nQWERTZUIOPASDFGHJ"),
]

rows = []
for i, (s, t) in enumerate(REAL, 1):
    rows.append({"id": f"R{i:02}", "text": t, "sender": s, "label": "legitime", "type": "legitime", "origin": "reel_masque"})
for i, (s, t) in enumerate(LEGIT, 1):
    rows.append({"id": f"L{i:02}", "text": t, "sender": s, "label": "legitime", "type": "legitime", "origin": "reconstitue"})
for i, (s, t) in enumerate(FAKE_TRANSFER, 1):
    rows.append({"id": f"F{i:02}", "text": t, "sender": s, "label": "arnaque", "type": "faux_transfert", "origin": "reconstitue"})
for i, (s, t) in enumerate(DEPOSIT_ERROR, 1):
    rows.append({"id": f"D{i:02}", "text": t, "sender": s, "label": "arnaque", "type": "depot_erreur", "origin": "reconstitue"})

out = pathlib.Path(__file__).with_name("messages.jsonl")
out.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")
print(len(rows), "rows ->", out)
