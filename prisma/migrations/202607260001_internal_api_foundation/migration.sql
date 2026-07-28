-- Extend API keys for signed internal API calls.
ALTER TABLE "ApiKey" ADD COLUMN "keyId" TEXT;
UPDATE "ApiKey"
SET "keyId" = CONCAT('key_', SUBSTRING("id", 1, 12))
WHERE "keyId" IS NULL;
ALTER TABLE "ApiKey" ALTER COLUMN "keyId" SET NOT NULL;
ALTER TABLE "ApiKey" ADD COLUMN "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ApiKey" ADD COLUMN "lastUsedAt" TIMESTAMP(3);
ALTER TABLE "ApiKey" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Human handoff notes stored as first-class tenant-scoped records.
CREATE TABLE "InternalNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "handoffId" TEXT,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

-- Persistent rate-limit buckets survive process restarts.
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- Failed automation and webhook events wait here for inspection or replay.
CREATE TABLE "DeadLetterEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeadLetterEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiKey_keyId_key" ON "ApiKey"("keyId");
CREATE INDEX "InternalNote_tenantId_idx" ON "InternalNote"("tenantId");
CREATE INDEX "InternalNote_conversationId_idx" ON "InternalNote"("conversationId");
CREATE INDEX "InternalNote_handoffId_idx" ON "InternalNote"("handoffId");
CREATE INDEX "InternalNote_authorUserId_idx" ON "InternalNote"("authorUserId");
CREATE UNIQUE INDEX "RateLimitBucket_identifier_key" ON "RateLimitBucket"("identifier");
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");
CREATE INDEX "DeadLetterEvent_tenantId_idx" ON "DeadLetterEvent"("tenantId");
CREATE INDEX "DeadLetterEvent_status_idx" ON "DeadLetterEvent"("status");
CREATE INDEX "DeadLetterEvent_nextRetryAt_idx" ON "DeadLetterEvent"("nextRetryAt");

ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_handoffId_fkey" FOREIGN KEY ("handoffId") REFERENCES "Handoff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeadLetterEvent" ADD CONSTRAINT "DeadLetterEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
