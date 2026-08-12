-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chainAssetId" INTEGER,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL DEFAULT 'Construction Equipment',
    "ownerAddress" TEXT NOT NULL,
    "metadataURI" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verification" INTEGER,
    "riskScore" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Asset" ("chainAssetId", "createdAt", "id", "metadataURI", "name", "ownerAddress", "riskScore", "status", "updatedAt", "verification") SELECT "chainAssetId", "createdAt", "id", "metadataURI", "name", "ownerAddress", "riskScore", "status", "updatedAt", "verification" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE UNIQUE INDEX "Asset_chainAssetId_key" ON "Asset"("chainAssetId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
