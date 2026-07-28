ALTER TABLE "ActionDefinition"
  ADD COLUMN "encryptedAuthPayload" TEXT,
  ADD COLUMN "authIv" TEXT,
  ADD COLUMN "authTag" TEXT,
  ADD COLUMN "allowedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
