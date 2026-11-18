// The verifier as a Netlify function: same origin as the app, so no CORS. Same code path as verifier/server.
import { rateLimiter, verify } from "../../verifier/server/verify";
import { classifyWithWorkersAi, DEFAULT_MODEL } from "../../verifier/server/workersai";

const limited = rateLimiter();

export default async (req: Request, context: { ip?: string }) => {
  if (req.method !== "POST") return Response.json({ error: "introuvable" }, { status: 404 });
  if (limited(context.ip ?? "?")) return Response.json({ error: "trop_de_demandes" }, { status: 429 });
  const { CF_ACCOUNT_ID: accountId = "", CF_API_TOKEN: token = "", CF_MODEL: model = DEFAULT_MODEL } = process.env;
  const r = await verify(await req.text(), (masked, lang) => classifyWithWorkersAi(masked, lang, { accountId, token, model }));
  return Response.json(r.body, { status: r.status });
};

export const config = { path: "/api/verify" };
