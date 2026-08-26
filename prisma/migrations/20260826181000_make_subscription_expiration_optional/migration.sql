-- Record the existing schema-level Users(email) lookup index without failing
-- on databases where it was already created manually.
CREATE INDEX IF NOT EXISTS "email_index" ON "Users"("email");

-- Free subscriptions do not expire, so signup must be able to write NULL.
ALTER TABLE "Subscriptions" ALTER COLUMN "expirationDate" DROP NOT NULL;
