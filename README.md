# fedapay-node

FedaPay wrapper for mobile money payments (collect): create transaction, send payment link, get status, handle webhooks.

## Prerequisites

- Node.js 18+
- FedaPay API keys (sandbox or live)

## Configuration

Copy the example file and set your keys:

```bash
cp .env.example .env
```

Environment variables:

| Variable | Description |
|----------|-------------|
| `FEDAPAY_KEY` | Secret API key (e.g. `sk_...`) |
| `FEDAPAY_ENV` | `sandbox` or `live` |
| `FEDAPAY_WEBHOOK_SECRET` | Secret to verify webhook signatures (`wh_...`) |

## Installation

```bash
npm install
```

## Usage

Main module: `usage/collect.mjs`. Exports:

- **initCollect** – Create a transaction (collect)
- **payNow** – Send pay-now (token + mode)
- **getTransaction** – Get a transaction by ID
- **handleWebhook** – Verify and parse a FedaPay webhook
- **toNormalizedStatus** – Map FedaPay status to internal status
- **FEDAPAY_STATUS** / **NORMALIZED_STATUS** – Status constants

### Example: initCollect

```javascript
import { initCollect } from "./usage/collect.mjs";

const result = await initCollect({
  description: "Test purchase",
  amount: 1500,
  currencyIso: "XOF",
  customer: {
    firstname: "Jean",
    lastname: "Dupont",
    email: "jean@example.com",
    phone: "97000000",
    countryCode: "bj",
  },
});
console.log(result.id, result.normalizedStatus, result.amount);
```

### Example: payNow

```javascript
import { payNow } from "./usage/collect.mjs";

await payNow({
  transactionId: result.id,
  provider: "MTN",
  phone: "97000000",
  countryCode: "bj",
});
```

### Example: getTransaction

```javascript
import { getTransaction } from "./usage/collect.mjs";

const tx = await getTransaction({ transactionId: "tx_xxx" });
console.log(tx.normalizedStatus, tx.amount);
```

### Example: handleWebhook

```javascript
import { handleWebhook } from "./usage/collect.mjs";

const payload = await handleWebhook({
  rawBody: req.rawBody,
  body: req.body,
  headers: req.headers,
});
console.log(payload.ok, payload.name, payload.transactionId, payload.status);
```

## API (endpoints)

Base URL: `http://localhost:PORT/v1` (root aliases: `GET /`, `GET /health` without prefix).

Start the server:

```bash
npm start
```

Development with reload:

```bash
npm run dev
```

Default port: `PORT=3000`.

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/`, `/health` | Health check (response `OK`) |
| `GET`  | `/v1/health` | Same, versioned |
| `POST` | `/v1/collect` | Create a collect (body: `description?`, `amount`, `currencyIso?`, `customer`) |
| `POST` | `/v1/collect/pay` | Send payment (body: `transactionId`, `provider?`, `phone`, `countryCode?`) |
| `GET`  | `/v1/transaction/:id` | Get a transaction by ID |
| `POST` | `/v1/webhook` | FedaPay webhooks (raw JSON body, header `x-fedapay-signature` required) |

Examples:

```bash
# Health
curl http://localhost:3000/v1/health

# Create a collect
curl -X POST http://localhost:3000/v1/collect \
  -H "Content-Type: application/json" \
  -d '{"amount":1500,"customer":{"phone":"97000000","countryCode":"bj"}}'

# Get a transaction
curl http://localhost:3000/v1/transaction/tx_xxxxx
```

## Tested cases and responses

Tests (`npm run test`) cover the cases below. Response bodies are those returned by the API (may be shown in the UI; kept in French).

### GET /, GET /health, GET /v1/health

| Case | Code | Body |
|------|------|------|
| Success | 200 | `OK` (text) |

### POST /v1/collect

| Case | Code | Body |
|------|------|------|
| Empty body or `amount` missing | 400 | `{ "error": "Montant invalide." }` |
| `amount` = 0, negative or non-numeric | 400 | `{ "error": "Montant invalide." }` |
| `customer.phone` missing or empty | 400 | `{ "error": "Numéro de téléphone invalide." }` |
| Success (valid payload) | 200 | `{ "id", "amount", "fedapayStatus", "normalizedStatus", "currency", "raw" }` |

### POST /v1/collect/pay

| Case | Code | Body |
|------|------|------|
| `transactionId` missing, empty or whitespace | 400 | `{ "error": "transactionId requis." }` |
| `phone` missing | 400 | `{ "error": "Numéro de téléphone invalide." }` |
| Non-existent `transactionId` (FedaPay) | 400 | `{ "error": "..." }` (FedaPay message) |
| Success | 200 | `{ "ok": true, "transactionId", "mode" }` |

### GET /v1/transaction/:id

| Case | Code | Body |
|------|------|------|
| Id empty or whitespace | 400 or 404 | 400: `{ "error": "transactionId requis." }` |
| Non-existent id (FedaPay) | 400 | `{ "error": "..." }` |
| Success | 200 | `{ "id", "fedapayStatus", "normalizedStatus", "amount", "currency", "raw" }` |

### POST /v1/webhook

| Case | Code | Body |
|------|------|------|
| Body missing or empty | 400 | `{ "error": "raw body manquant" }` |
| Header `x-fedapay-signature` missing | 400 | `{ "error": "Signature webhook manquante" }` |
| Invalid signature | 400 | `{ "error": "..." }` |
| Success (valid signed payload) | 200 | `{ "ok": true, "name", "transactionId?", "status?", "raw" }` |

### Non-existent routes

| Case | Code |
|------|------|
| GET /v1/inexistant, POST /v1/collect/inexistant, etc. | 404 |

## Licence

MIT
