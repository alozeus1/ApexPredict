import { Resend } from 'resend';
import { WaitlistVerify, WaitlistWelcome } from '@apexpredix/email';
import type { ReactElement } from 'react';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const from = process.env.RESEND_FROM_ADDRESS ?? 'ApexPredix AI <noreply@mail.apexpredix.ai>';

async function send(to: string, subject: string, react: ReactElement) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY missing — logging instead of sending', { to, subject });
    return;
  }
  const { error } = await resend.emails.send({ from, to, subject, react });
  if (error) throw new Error(`Resend failed: ${error.message}`);
}

export const sendVerifyEmail = (to: string, verifyUrl: string, locale: string) =>
  send(to, 'Confirm your seat on the ApexPredix AI waitlist', WaitlistVerify({ verifyUrl, locale }));

export const sendWelcomeEmail = (to: string, referralUrl: string, locale: string) =>
  send(to, 'You are on the ApexPredix AI list', WaitlistWelcome({ referralUrl, locale }));
