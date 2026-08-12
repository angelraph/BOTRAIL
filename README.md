# BOTRAIL

AI-verified real-world-asset settlement, construction-equipment vertical, built for BOT Chain (EVM, mainnet chain ID `677`).

BOTRAIL turns messy real-world evidence about a physical asset (documents, photos, inspection reports) into on-chain asset state, and uses that state to gate real payments. The core feature is **"Prove before you pay"**: a rental payment held in escrow is released only when AI-evaluated evidence satisfies the agreement's conditions, and gets frozen if a tracked condition (e.g. insurance) later lapses.

Design boundary that the whole system is built around: **the AI never moves funds.** It produces a structured, hashed verdict. A deterministic on-chain rule in the smart contract is what actually releases or freezes payment.

## Layout

- `contracts/` — Foundry project: `AssetRegistry.sol`, `SettlementEscrow.sol`
- `app/` — Next.js app (frontend + API routes + AI evidence layer + chain client)
- `DEMO.md` — click-by-click walkthrough of the 4-scene demo

## Quick start (local)

```bash
# 1. Contracts
cd contracts
forge test
anvil                              # in its own terminal
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 2. App
cd ../app
cp ../.env.example .env            # fill in OPENAI_API_KEY, deployed addresses
npm install
npx prisma migrate dev
npm run dev
```

See `DEMO.md` for the full walkthrough once both are running.
