import { Router } from "express";
import * as collectController from "../../controllers/collectController.mjs";

const router = Router();
// POST /collect → 200 { id, amount, normalizedStatus, ... } ou 400 { error }
router.post("/collect", collectController.createCollect);
// POST /collect/pay → 200 { ok, transactionId, mode } ou 400 { error }
router.post("/collect/pay", collectController.payCollect);

export default router;
