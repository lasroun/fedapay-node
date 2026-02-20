import { Router } from "express";
import express from "express";
import * as webhookController from "../../controllers/webhookController.mjs";

const router = Router();
// POST /webhook (raw JSON body, header x-fedapay-signature) → 200 { ok, name, transactionId?, status?, raw } or 400 { error }
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  webhookController.handle
);

export default router;
