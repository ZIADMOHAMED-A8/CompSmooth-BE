-- CreateIndex
CREATE INDEX "Payments_userId_idx" ON "Payments"("userId");

-- CreateIndex
CREATE INDEX "Usage_logs_userId_idx" ON "Usage_logs"("userId");

-- CreateIndex
CREATE INDEX "Subscriptions_planId_idx" ON "Subscriptions"("planId");

-- CreateIndex
CREATE INDEX "Subscriptions_userId_status_expirationDate_idx" ON "Subscriptions"("userId", "status", "expirationDate");
