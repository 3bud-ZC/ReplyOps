-- Tenant operational settings.
ALTER TABLE "Tenant" ADD COLUMN "industry" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "description" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo';
ALTER TABLE "Tenant" ADD COLUMN "primaryLanguage" TEXT NOT NULL DEFAULT 'ar';
ALTER TABLE "Tenant" ADD COLUMN "supportedLanguages" TEXT[] NOT NULL DEFAULT ARRAY['ar','en']::TEXT[];
ALTER TABLE "Tenant" ADD COLUMN "workingHours" JSONB;
ALTER TABLE "Tenant" ADD COLUMN "contactData" JSONB;
ALTER TABLE "Tenant" ADD COLUMN "defaultCurrency" TEXT NOT NULL DEFAULT 'EGP';
ALTER TABLE "Tenant" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tenant" ADD COLUMN "dataRetentionDays" INTEGER NOT NULL DEFAULT 365;

-- Assistant runtime settings used by Test Lab and channel automation.
ALTER TABLE "AssistantConfiguration" ADD COLUMN "helpMessage" TEXT;
ALTER TABLE "AssistantConfiguration" ADD COLUMN "maxResponseLength" INTEGER NOT NULL DEFAULT 1200;
ALTER TABLE "AssistantConfiguration" ADD COLUMN "approvalRequiredActions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AssistantConfiguration" ADD COLUMN "businessHoursBehavior" TEXT NOT NULL DEFAULT 'answer_with_offline_notice';
ALTER TABLE "AssistantConfiguration" ADD COLUMN "offlineResponseBehavior" TEXT NOT NULL DEFAULT 'answer_with_handoff_option';

-- Internal HMAC key lifecycle. Existing keyHash remains for compatibility.
ALTER TABLE "ApiKey" ADD COLUMN "encryptedSecret" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN "iv" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN "authTag" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ApiKey" ADD COLUMN "revokedAt" TIMESTAMP(3);
ALTER TABLE "ApiKey" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "ApiKey_enabled_idx" ON "ApiKey"("enabled");
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");
