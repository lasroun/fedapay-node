import * as collectService from "../services/collectService.mjs";
import errorMessage from "../lib/errorMessage.mjs";

// req.params.id: FedaPay transaction id
// Response: 200 + { id, fedapayStatus, normalizedStatus, amount, currency, raw } — or 400 + { error }
export async function getById(req, res) {
  try {
    const result = await collectService.getTransaction({
      transactionId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: errorMessage(err) });
  }
}
