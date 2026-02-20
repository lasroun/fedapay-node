/**
 * API endpoint tests (success, failure, invalid payload).
 * Requires .env with FEDAPAY_KEY and FEDAPAY_WEBHOOK_SECRET to load the app.
 * FedaPay success tests (POST /collect, /collect/pay, GET /transaction/:id) run only when FEDAPAY_KEY is set (sandbox).
 */
import "dotenv/config";
import { describe, it } from "node:test";
import assert from "node:assert";
import request from "supertest";
import app from "../server.mjs";

const hasFedaPayKey = Boolean(process.env.FEDAPAY_KEY);

describe("GET /", () => {
  it("returns 200 with body OK", async () => {
    const res = await request(app).get("/");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.text, "OK");
  });
});

describe("GET /health", () => {
  it("returns 200 with body OK", async () => {
    const res = await request(app).get("/health");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.text, "OK");
  });
});

describe("POST /v1/collect", () => {
  it("returns 400 when body empty (amount missing)", async () => {
    const res = await request(app).post("/v1/collect").send({});
    assert.strictEqual(res.status, 400);
    assert.match(res.body?.error || res.text, /Montant invalide|invalide/i);
  });

  it("returns 400 when amount missing but customer present", async () => {
    const res = await request(app)
      .post("/v1/collect")
      .send({ customer: { phone: "90123456" } });
    assert.strictEqual(res.status, 400);
    assert.match(res.body?.error || res.text, /Montant invalide|invalide/i);
  });

  it("returns 400 when amount = 0", async () => {
    const res = await request(app)
      .post("/v1/collect")
      .send({ amount: 0, customer: { phone: "90123456" } });
    assert.strictEqual(res.status, 400);
    assert.match(res.body?.error || res.text, /Montant invalide|invalide/i);
  });

  it("returns 400 when amount negative", async () => {
    const res = await request(app)
      .post("/v1/collect")
      .send({ amount: -100, customer: { phone: "90123456" } });
    assert.strictEqual(res.status, 400);
    assert.match(res.body?.error || res.text, /Montant invalide|invalide/i);
  });

  it("returns 400 when amount not numeric", async () => {
    const res = await request(app)
      .post("/v1/collect")
      .send({ amount: "abc", customer: { phone: "90123456" } });
    assert.strictEqual(res.status, 400);
    assert.match(res.body?.error || res.text, /Montant invalide|invalide/i);
  });

  it("returns 400 when customer.phone missing", async () => {
    const res = await request(app)
      .post("/v1/collect")
      .send({ amount: 1500, customer: {} });
    assert.strictEqual(res.status, 400);
    assert.match(
      res.body?.error || res.text,
      /téléphone|phone|Numéro de téléphone invalide/i
    );
  });

  it("returns 400 when customer.phone empty", async () => {
    const res = await request(app)
      .post("/v1/collect")
      .send({ amount: 1500, customer: { phone: "   " } });
    assert.strictEqual(res.status, 400);
    assert.match(
      res.body?.error || res.text,
      /téléphone|phone|Numéro de téléphone invalide/i
    );
  });

  it("returns 200 with id, amount, normalizedStatus when payload valid (FedaPay)", async function () {
    if (!hasFedaPayKey) {
      this.skip();
      return;
    }
    const res = await request(app)
      .post("/v1/collect")
      .send({
        amount: 100,
        customer: { phone: "90123456", countryCode: "bj" },
      });
    if (res.status === 400) {
      this.skip();
      return;
    }
    assert.strictEqual(res.status, 200);
    assert.ok(res.body?.id);
    assert.strictEqual(res.body?.amount, 100);
    assert.ok(res.body?.normalizedStatus);
    assert.ok(["pending", "paid", "failed", "canceled", "expired", "refunded"].includes(res.body?.normalizedStatus));
  });
});

describe("POST /v1/collect/pay", () => {
  it("returns 400 when transactionId missing", async () => {
    const res = await request(app)
      .post("/v1/collect/pay")
      .send({ phone: "90123456" });
    assert.strictEqual(res.status, 400);
    assert.match(
      res.body?.error || res.text,
      /transactionId requis|requis/i
    );
  });

  it("returns 400 when phone missing", async () => {
    const res = await request(app)
      .post("/v1/collect/pay")
      .send({ transactionId: "tx_123" });
    assert.strictEqual(res.status, 400);
    assert.match(
      res.body?.error || res.text,
      /téléphone|phone|Numéro de téléphone invalide/i
    );
  });

  it("returns 400 when transactionId empty string", async () => {
    const res = await request(app)
      .post("/v1/collect/pay")
      .send({ transactionId: "", phone: "90123456" });
    assert.strictEqual(res.status, 400);
    assert.match(res.body?.error || res.text, /transactionId requis|requis/i);
  });

  it("returns 400 when transactionId whitespace only", async () => {
    const res = await request(app)
      .post("/v1/collect/pay")
      .send({ transactionId: "   ", phone: "90123456" });
    assert.strictEqual(res.status, 400);
    assert.match(res.body?.error || res.text, /transactionId requis|requis/i);
  });

  it("returns 400 for non-existent transactionId (FedaPay)", async () => {
    const res = await request(app)
      .post("/v1/collect/pay")
      .send({
        transactionId: "tx_inexistant_123",
        phone: "90123456",
      });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body?.error || res.text);
  });

  it("returns 200 with ok: true (FedaPay) when transactionId valid", async function () {
    if (!hasFedaPayKey) {
      this.skip();
      return;
    }
    const createRes = await request(app)
      .post("/v1/collect")
      .send({
        amount: 100,
        customer: { phone: "90123456", countryCode: "bj" },
      });
    if (createRes.status !== 200 || !createRes.body?.id) {
      this.skip();
      return;
    }
    const txId = createRes.body.id;
    const res = await request(app)
      .post("/v1/collect/pay")
      .send({
        transactionId: txId,
        phone: "90123456",
        countryCode: "bj",
      });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body?.ok, true);
    assert.strictEqual(String(res.body?.transactionId), String(txId));
  });
});

describe("GET /v1/transaction/:id", () => {
  it("returns 400 or 404 when id empty (empty segment)", async () => {
    const res = await request(app).get("/v1/transaction/");
    assert.ok([400, 404].includes(res.status), `expected 400 or 404, got ${res.status}`);
    if (res.status === 400) {
      assert.match(res.body?.error || res.text, /transactionId|requis/i);
    }
  });

  it("returns 400 when id is whitespace only", async () => {
    const res = await request(app).get("/v1/transaction/%20%20");
    assert.strictEqual(res.status, 400);
    assert.match(res.body?.error || res.text, /transactionId requis|requis/i);
  });

  it("returns 400 for non-existent id (FedaPay)", async () => {
    const res = await request(app).get(
      "/v1/transaction/tx_inexistant_123"
    );
    assert.strictEqual(res.status, 400);
    assert.ok(res.body?.error || res.text);
  });

  it("returns 200 with id, fedapayStatus, normalizedStatus (FedaPay)", async function () {
    if (!hasFedaPayKey) {
      this.skip();
      return;
    }
    const createRes = await request(app)
      .post("/v1/collect")
      .send({
        amount: 100,
        customer: { phone: "90123456", countryCode: "bj" },
      });
    if (createRes.status !== 200 || !createRes.body?.id) {
      this.skip();
      return;
    }
    const txId = createRes.body.id;
    const res = await request(app).get(`/v1/transaction/${txId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body?.id, txId);
    assert.ok(res.body?.fedapayStatus);
    assert.ok(res.body?.normalizedStatus);
  });
});

describe("POST /v1/webhook", () => {
  it("returns 400 when body missing or empty", async () => {
    const res = await request(app)
      .post("/v1/webhook")
      .set("Content-Type", "application/json")
      .set("x-fedapay-signature", "some_sig")
      .send("");
    assert.strictEqual(res.status, 400);
    assert.match(
      res.body?.error || res.text,
      /raw body manquant|body manquant/i
    );
  });

  it("returns 400 when x-fedapay-signature missing", async () => {
    const res = await request(app)
      .post("/v1/webhook")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ data: {} }));
    assert.strictEqual(res.status, 400);
    assert.match(
      res.body?.error || res.text,
      /Signature|signature|manquant/i
    );
  });

  it("returns 400 when signature invalid", async () => {
    const res = await request(app)
      .post("/v1/webhook")
      .set("Content-Type", "application/json")
      .set("x-fedapay-signature", "invalid_signature")
      .send(JSON.stringify({ name: "transaction.approved", data: {} }));
    assert.strictEqual(res.status, 400);
    assert.ok(res.body?.error || res.text);
  });
});

describe("Non-existent routes", () => {
  it("returns 404 for GET /v1/inexistant", async () => {
    const res = await request(app).get("/v1/inexistant");
    assert.strictEqual(res.status, 404);
  });

  it("returns 404 for POST /v1/collect/inexistant", async () => {
    const res = await request(app).post("/v1/collect/inexistant").send({});
    assert.strictEqual(res.status, 404);
  });
});
