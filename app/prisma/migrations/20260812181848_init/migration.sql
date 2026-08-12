-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "chainAssetId" INTEGER,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL DEFAULT 'Construction Equipment',
    "ownerAddress" TEXT NOT NULL,
    "metadataURI" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verification" INTEGER,
    "riskScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "agreementId" INTEGER,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "sha256Hash" TEXT NOT NULL,
    "aiVerdictJson" TEXT NOT NULL,
    "conditionsMet" BOOLEAN,
    "newStatus" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "chainAgreementId" INTEGER,
    "payerAddress" TEXT NOT NULL,
    "payeeAddress" TEXT NOT NULL,
    "amountBot" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "conditionsHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "txHashCreate" TEXT,
    "txHashRelease" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_chainAssetId_key" ON "Asset"("chainAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_chainAgreementId_key" ON "Agreement"("chainAgreementId");

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
