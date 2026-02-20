import * as collectService from "../services/collectService.mjs";
import errorMessage from "../lib/errorMessage.mjs";

// req.body: description?, amount, currencyIso?, customer (phone required, firstname?, lastname?, email?, countryCode?)
// Response: 200 + { id, amount, fedapayStatus, normalizedStatus, currency, raw } — or 400 + { error }
export async function createCollect(req, res) {
  try {
    const result = await collectService.initCollect(req.body ?? {});
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: errorMessage(err) });
  }
}

// req.body: transactionId, phone, provider?, countryCode?
// Response: 200 + { ok, transactionId, mode } — or 400 + { error }
export async function payCollect(req, res) {
  try {
    const result = await collectService.payNow(req.body ?? {});
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: errorMessage(err) });
  }
}
