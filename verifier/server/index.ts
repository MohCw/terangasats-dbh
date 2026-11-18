import { createServer } from "./server";
import { classifyWithWorkersAi, DEFAULT_MODEL } from "./workersai";

const port = Number(process.env.PORT ?? 8787);
const { CF_ACCOUNT_ID: accountId = "", CF_API_TOKEN: token = "", CF_MODEL: model = DEFAULT_MODEL } = process.env;
if (!accountId || !token) console.warn("CF_ACCOUNT_ID / CF_API_TOKEN missing: every AI check will answer a_verifier");

createServer({
  classify: (masked, lang) => classifyWithWorkersAi(masked, lang, { accountId, token, model }),
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? "http://localhost:8080",
  trustProxy: process.env.TRUST_PROXY === "1",
}).listen(port, () => console.log(`verifier listening on ${port}, AI: Workers AI ${model}`));
