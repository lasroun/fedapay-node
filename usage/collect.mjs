// usage/collect.mjs
import dotenv from "dotenv";
import { FedaPay, Transaction, Webhook } from "fedapay";

dotenv.config();

/**
 * =========================
 * Config
 * =========================
 */
const FEDAPAY_KEY = process.env.FEDAPAY_KEY;
const FEDAPAY_ENV = String(process.env.FEDAPAY_ENV || "sandbox").toLowerCase();
const FEDAPAY_WEBHOOK_SECRET = process.env.FEDAPAY_WEBHOOK_SECRET;

if (!FEDAPAY_KEY) {
  throw new Error("FEDAPAY_KEY manquant");
}

if (!["sandbox", "live"].includes(FEDAPAY_ENV)) {
  throw new Error("sandbox | live");
}

if (!FEDAPAY_WEBHOOK_SECRET) {
  throw new Error("FEDAPAY_WEBHOOK_SECRET manquant");
}

FedaPay.setApiKey(FEDAPAY_KEY);
FedaPay.setEnvironment(FEDAPAY_ENV); // sandbox | live

/**
 * =========================
 * Status (Collects)
 * =========================
 */
export const FEDAPAY_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  DECLINED: "declined",
  CANCELED: "canceled",
  EXPIRED: "expired",
  TRANSFERRED: "transferred",
  REFUNDED: "refunded",
});

export const NORMALIZED_STATUS = Object.freeze({
  PENDING: "pending",
  PAID: "paid", // approved | transferred
  FAILED: "failed", // declined
  CANCELED: "canceled", // canceled
  EXPIRED: "expired", // expired
  REFUNDED: "refunded", // refunded
});

/**
 * FedaPay -> interne
 */
export const toNormalizedStatus = (fedapayStatus) => {
  const s = (fedapayStatus || "").trim().toLowerCase();

  switch (s) {
    case FEDAPAY_STATUS.PENDING:
      return NORMALIZED_STATUS.PENDING;

    case FEDAPAY_STATUS.APPROVED:
    case FEDAPAY_STATUS.TRANSFERRED:
      return NORMALIZED_STATUS.PAID;

    case FEDAPAY_STATUS.DECLINED:
      return NORMALIZED_STATUS.FAILED;

    case FEDAPAY_STATUS.CANCELED:
      return NORMALIZED_STATUS.CANCELED;

    case FEDAPAY_STATUS.EXPIRED:
      return NORMALIZED_STATUS.EXPIRED;

    case FEDAPAY_STATUS.REFUNDED:
      return NORMALIZED_STATUS.REFUNDED;

    default:
      throw new Error(`Statut: "${s}"`);
  }
};

/**
 * =========================
 * Helpers
 * =========================
 */
const toAmountInt = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Montant invalide.");
  return Math.round(n);
};

const normalizePhone = (phone) => {
  const p = String(phone || "").trim();
  if (!p) throw new Error("Numéro de téléphone invalide.");
  return p;
};

const normalizeCountryCode = (cc) =>
  String(cc || "bj")
    .trim()
    .toLowerCase();

const normalizeProvider = (provider) =>
  String(provider || "")
    .trim()
    .toUpperCase();

/**
 * Mode payment (FedaPay)
 * - sandbox => momo_test
 * - live =>  provider
 */
const getPaymentMode = (provider) => {
  if (FEDAPAY_ENV !== "live") return "momo_test";

  const p = normalizeProvider(provider);
  if (p === "MTN") return "mtn_open";
  if (p === "MOOV") return "moov";
  if (p === "CELTIIS") return "celtiis_benin";

  throw new Error("Provider invalide.");
};

/**
 * =========================
 * Functions
 * =========================
 */
export const initCollect = async ({
  description = "descr - XXXXX",
  amount,
  currencyIso = "XOF",
  customer = {},
}) => {
  const tx = await Transaction.create({
    description: String(description),
    amount: toAmountInt(amount),
    currency: { iso: String(currencyIso || "XOF").toUpperCase() },
    customer: {
      firstname: String(customer.firstname || "Client"),
      lastname: String(customer.lastname || "LASROUN"),
      email: String(customer.email || "client@lasroun.com"),
      phone_number: {
        number: normalizePhone(customer.phone),
        country: normalizeCountryCode(customer.countryCode),
      },
    },
  });

  if (!tx?.status) {
    throw new Error("Transaction créée mais statut manquant.");
  }

  return {
    id: tx.id,
    fedapayStatus: tx.status,
    normalizedStatus: toNormalizedStatus(tx.status),
    amount: tx.amount,
    currency: tx?.currency?.iso,
    raw: tx,
  };
};

export const payNow = async ({
  transactionId,
  provider,
  phone,
  countryCode = "bj",
}) => {
  if (!transactionId) throw new Error("transactionId requis.");

  const transaction = await Transaction.retrieve(transactionId);

  const gen = await transaction.generateToken();
  const token = gen?.token;
  if (!token) throw new Error("Token FedaPay introuvable.");

  const mode = getPaymentMode(provider);

  await transaction.sendNowWithToken(mode, token, {
    number: normalizePhone(phone),
    country: normalizeCountryCode(countryCode),
  });

  return { ok: true, transactionId, mode };
};

export const getTransaction = async ({ transactionId }) => {
  if (!transactionId) throw new Error("transactionId requis.");

  const tx = await Transaction.retrieve(transactionId);

  if (!tx?.status) {
    throw new Error(
      "Transaction récupérée mais statut manquant (tx.status vide).",
    );
  }

  return {
    id: tx.id,
    fedapayStatus: tx.status,
    normalizedStatus: toNormalizedStatus(tx.status),
    amount: tx.amount,
    currency: tx?.currency?.iso,
    raw: tx,
  };
};

/**
 * Handler webhook FedaPay (minimal)
 */
export const handleWebhook = async (req) => {
  const raw = req.rawBody || req.body;
  if (!raw) throw new Error("raw body manquant");

  const sig = String(req.headers["x-fedapay-signature"] || "").trim();
  if (!sig) throw new Error("Signature webhook manquante");

  const event = Webhook.constructEvent(raw, sig, FEDAPAY_WEBHOOK_SECRET);

  switch (event?.name) {
    case "transaction.created":
      break;
    case "transaction.approved":
      break;
    case "transaction.canceled":
      break;
    default:
      break;
  }

  const transactionId =
    event?.data?.transaction?.id ||
    event?.data?.id ||
    event?.resource?.id ||
    event?.transaction?.id;

  const status =
    event?.data?.transaction?.status ||
    event?.data?.status ||
    event?.resource?.status ||
    event?.transaction?.status;

  return {
    ok: true,
    name: event?.name || null,
    transactionId,
    status,
    raw: event,
  };
};

export const fedapay = Object.freeze({
  initCollect,
  payNow,
  getTransaction,
  handleWebhook,
  FEDAPAY_STATUS,
  NORMALIZED_STATUS,
  toNormalizedStatus,
});
