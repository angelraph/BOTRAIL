# BOTRAIL demo walkthrough

Four scenes, matching the "Prove before you pay" pitch: register + verify an
asset, fund a rental agreement, deliver evidence that releases payment, then
show an unrelated critical issue (expired insurance) freezing the asset and
blocking further payment — all enforced on-chain, not just in the UI.

## Setup

```bash
# 1. Contracts (from repo root)
cd contracts
forge test                                    # 15 tests should pass
anvil                                         # leave running in its own terminal

# in another terminal
export ATTESTER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  # anvil account #0
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
# note the printed AssetRegistry / SettlementEscrow addresses

# 2. App (from repo root)
cd app
cp .env.example .env    # then fill in OPENAI_API_KEY and the two addresses above
npm install
npx prisma migrate dev
npm run dev              # http://localhost:3000
```

`.env` needs, at minimum:
- `OPENAI_API_KEY` — your real key (gpt-4o-mini is used by default; override with `OPENAI_MODEL`)
- `RPC_URL=http://127.0.0.1:8545`, `CHAIN_ID=31337` for local Anvil
- `ATTESTER_PRIVATE_KEY` — same key used to deploy
- `ASSET_REGISTRY_ADDRESS` / `SETTLEMENT_ESCROW_ADDRESS` — from the deploy script output

Evidence files for this walkthrough should be short `.txt` files (plain text
stand-ins for scanned documents) or `.jpg`/`.png` images — PDF parsing isn't
implemented; the AI layer reads images via vision and everything else as raw
text.

Ready-to-use sample evidence for exactly this walkthrough is in
`demo-evidence/` at the repo root (`ownership.txt`, `insurance_valid.txt`,
`insurance_expired.txt`, `inspection_pass.txt`, `photo_description.txt`,
`delivery.txt`) — this whole script was run end-to-end against a real
OpenAI key and a real local chain using these exact files; see results below.

## Scene 1 — Register & verify Excavator #2841

1. Go to `http://localhost:3000/assets/new`, create **Excavator #2841**
   (type: Construction Excavator).
2. On the asset page, use **Verify Asset** to upload all four documents at
   once: ownership, insurance (not expired), inspection (pass), and a photo.
3. Click **Verify Asset**.

Expected: the AI verdict lists all four checks passing, the asset registers
on-chain (first tx: `registerAsset`, second: `recordEvidence`), status shows
**ACTIVE**, and a verification % / risk score appear on the passport.

## Scene 2 — Fund a rental agreement

1. From the asset page, **+ New agreement**.
2. Amount: `8000` BOT. Conditions are fixed for the demo:
   `delivery_confirmed` + `inspection_passed`.
3. Submit — this deposits 8000 BOT into `SettlementEscrow` on-chain
   (`createAgreement`, funded from the attester wallet on the demo payer's
   behalf).

Expected: agreement status **FUNDED**, escrow-funded tx hash shown.

## Scene 3 — Deliver evidence, release payment

1. On the agreement page, upload a delivery photo/note and an inspection
   report that both clearly support the asset being delivered and passing
   inspection.
2. Submit **Upload & attempt release**.

Expected: verdict shows both conditions passing, banner reads **✓ Funds
released**, agreement status flips to **RELEASED**, a `recordEvidence` tx and
an `attemptRelease` tx both appear.

## Scene 4 — Expired insurance restricts the asset and blocks payment

1. Go back to the asset page's **Verify Asset** panel and upload *only* a
   new insurance document that is clearly expired (past date, or the text
   explicitly says "EXPIRED").
2. Submit.

Expected: verdict flags `insurance_valid` as failed and `criticalIssue:
true`, asset status flips to **RESTRICTED** on-chain immediately (a single
`recordEvidence` tx — this is a partial re-check, so per BOTRAIL's status
policy a clean partial check could never have cleared this, but a critical
finding always restricts immediately).

3. Create a second, smaller agreement on the same asset (e.g. `500` BOT,
   same conditions) and upload clean delivery/inspection evidence for it.

Expected: the AI verdict for delivery/inspection may itself look fine, but
the release banner reads **✗ Release refused by contract** — because
`SettlementEscrow.attemptRelease` checks `AssetRegistry.isActive()` at the
moment of release and the asset is RESTRICTED. This is the core claim of the
whole project made visible: the contract enforces it even when the evidence
for that specific payment looks clean.

## Verified run (local Anvil + real OpenAI key)

This exact script was executed end-to-end via the API (`curl`) against a
live `next dev` server, local Anvil, and a real `gpt-4o-mini` call — not
just designed on paper:

- Scene 1: all four checks passed, confidence 1.0, asset registered on-chain
  as asset #3, status ACTIVE, verification 100%, risk 0.
- Scene 2: agreement #4 (BOT Chain-numbered; DB id 1) funded with 8000 BOT,
  confirmed via `createAgreement` tx.
- Scene 3: delivery + inspection both passed, `released: true`, payee balance
  moved 10,000 → 18,000 (native token) on-chain.
- Scene 4: uploading *only* the expired insurance doc flipped the asset to
  RESTRICTED (`criticalIssue: true`, confidence 0.9) from a single partial
  check — confirming the status-transition policy in
  `lib/status-transition.ts` behaves as designed.
- Final step: a brand-new agreement (500 BOT) with clean delivery/inspection
  evidence — `conditionsMet: true` but `released: false`. Verified directly
  on-chain with `cast call`: the agreement's status is still `0` (FUNDED),
  the asset's status is still `1` (RESTRICTED), and `SettlementEscrow` is
  still holding the funds. The contract refused the release itself; nothing
  in the application layer had to intervene.

## What to point out to a judge

- Every status change and every payment decision has a transaction hash —
  click through to confirm it's real, not just a UI state.
- The AI never calls a contract function. `lib/ai/verify.ts` only ever
  returns a structured verdict; `lib/status-transition.ts` and
  `evaluateConditions()` are the deterministic, non-LLM code that decides
  what actually gets written on-chain.
- Scene 4 step 3 is the moment that matters: a real payment gets refused by
  the contract itself, not by application logic that could be bypassed.
