import { Router } from "express";
import * as healthController from "../../controllers/healthController.mjs";

const router = Router();
// GET /health → 200 "OK"
router.get("/health", healthController.health);

export default router;
