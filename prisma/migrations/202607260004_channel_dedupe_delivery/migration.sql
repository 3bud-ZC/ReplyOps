ALTER TABLE "Conversation"
  ADD COLUMN "externalThreadId" TEXT,
  ADD COLUMN "automationPaused" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastMessageAt" TIMESTAMP(3);

ALTER TABLE "Message"
  ADD COLUMN "externalMessageId" TEXT,
  ADD COLUMN "deliveryStatus" TEXT NOT NULL DEFAULT 'stored',
  ADD COLUMN "providerPayload" JSONB;

CREATE INDEX "Conversation_channelConnectionId_idx" ON "Conversation"("channelConnectionId");
CREATE UNIQUE INDEX "Conversation_tenantId_channelConnectionId_externalThreadId_key"
  ON "Conversation"("tenantId", "channelConnectionId", "externalThreadId");
CREATE UNIQUE INDEX "Message_conversationId_externalMessageId_key"
  ON "Message"("conversationId", "externalMessageId");
