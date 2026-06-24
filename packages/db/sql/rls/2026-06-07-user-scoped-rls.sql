-- Draft only. Do not apply until app.user_id is set per request.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_self ON "User" USING (id = current_setting('app.user_id')::text);

ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscription_self ON "Subscription" USING ("userId" = current_setting('app.user_id')::text);

ALTER TABLE "UserPick" ENABLE ROW LEVEL SECURITY;
CREATE POLICY userpick_self ON "UserPick" USING ("userId" = current_setting('app.user_id')::text);

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY auditlog_self ON "AuditLog" USING (actor = ('user:' || current_setting('app.user_id')::text));

ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_self ON "Account" USING ("userId" = current_setting('app.user_id')::text);

ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
CREATE POLICY session_self ON "Session" USING ("userId" = current_setting('app.user_id')::text);
