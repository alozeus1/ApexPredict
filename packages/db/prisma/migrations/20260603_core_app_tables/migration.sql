CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS "WaitlistSignup" (
  "id" TEXT NOT NULL,
  "email" CITEXT NOT NULL,
  "region" TEXT,
  "locale" TEXT NOT NULL,
  "premiumIntent" BOOLEAN NOT NULL DEFAULT false,
  "referralToken" TEXT NOT NULL,
  "referredByToken" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "ipHash" TEXT NOT NULL,
  "uaHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaitlistSignup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WaitlistSignup_email_key" ON "WaitlistSignup"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "WaitlistSignup_referralToken_key" ON "WaitlistSignup"("referralToken");
CREATE INDEX IF NOT EXISTS "WaitlistSignup_verifiedAt_idx" ON "WaitlistSignup"("verifiedAt");
CREATE INDEX IF NOT EXISTS "WaitlistSignup_referredByToken_idx" ON "WaitlistSignup"("referredByToken");

CREATE TABLE IF NOT EXISTS "CookieConsent" (
  "id" TEXT NOT NULL,
  "anonDeviceId" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "choices" JSONB NOT NULL,
  "version" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CookieConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CookieConsent_anonDeviceId_key" ON "CookieConsent"("anonDeviceId");

CREATE TABLE IF NOT EXISTS "VerificationToken" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_tokenHash_key" ON "VerificationToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "VerificationToken_email_idx" ON "VerificationToken"("email");

CREATE TABLE IF NOT EXISTS "GeoBlockEvent" (
  "id" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "region" TEXT,
  "ipHash" TEXT NOT NULL,
  "uaHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeoBlockEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GeoBlockEvent_country_createdAt_idx" ON "GeoBlockEvent"("country", "createdAt");
