import { Router } from "express";
import * as transactionController from "../../controllers/transactionController.mjs";

const router = Router();
// GET /transaction/:id → 200 { id, fedapayStatus, normalizedStatus, ... } ou 400 { error }
router.get("/transaction/:id", transactionController.getById);

export default router;
