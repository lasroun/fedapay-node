import express from "express";
import v1Router from "./v1/index.mjs";
import webhookRouter from "./v1/webhook.mjs";
import * as healthController from "../controllers/healthController.mjs";

// app: Express instance — mount webhook before express.json() so raw body is preserved
export default function mountRoutes(app) {
  app.use("/v1", webhookRouter);
  app.use(express.json());
  app.use("/v1", v1Router);
  app.get("/", healthController.ping);
  app.get("/health", healthController.health);
}
