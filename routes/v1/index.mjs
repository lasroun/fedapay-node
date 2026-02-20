import { Router } from "express";
import healthRoutes from "./health.mjs";
import collectRoutes from "./collect.mjs";
import transactionRoutes from "./transaction.mjs";

const router = Router();
router.use(healthRoutes);
router.use(collectRoutes);
router.use(transactionRoutes);

export default router;
