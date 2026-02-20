import * as collectService from "../services/collectService.mjs";
import errorMessage from "../lib/errorMessage.mjs";

// req.body: raw body (Buffer/string) for signature verification — req.headers: must include x-fedapay-signature
// Response: 200 + { ok, name, transactionId?, status?, raw } — or 400 + { error }
export async function handle(req, res) {
  try {
    const rawBody =
      Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;
    const result = await collectService.handleWebhook({
      rawBody,
      body: rawBody,
      headers: req.headers,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: errorMessage(err) });
  }
}
