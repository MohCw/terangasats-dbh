export type Payment = { paymentHash: string; preimage: string; sats: number };
export interface Wallet {
  createInvoice(sats: number, description: string, expirySecs: number): Promise<{ bolt11: string; paymentHash: string }>;
  onPaymentReceived(cb: (p: Payment) => void): () => void;
  getBalanceSats(): Promise<number>;
  pay(bolt11: string): Promise<void>;
}
