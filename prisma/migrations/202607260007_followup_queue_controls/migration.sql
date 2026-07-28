ALTER TABLE "Customer"
  ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "optedOutAt" TIMESTAMP(3);

ALTER TABLE "FollowupJob"
  ADD COLUMN "conversationId" TEXT,
  ADD COLUMN "customerId" TEXT,
  ADD COLUMN "payload" JSONB,
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastError" TEXT;

CREATE INDEX "FollowupJob_conversationId_idx" ON "FollowupJob"("conversationId");
CREATE INDEX "FollowupJob_customerId_idx" ON "FollowupJob"("customerId");
CREATE INDEX "FollowupJob_scheduledFor_idx" ON "FollowupJob"("scheduledFor");

ALTER TABLE "FollowupJob" ADD CONSTRAINT "FollowupJob_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
