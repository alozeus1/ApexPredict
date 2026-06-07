import 'server-only';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { WaitlistVerify, WaitlistWelcome, AuthVerify, AuthReset } from '@apexpredix/email';
import type { ReactElement } from 'react';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const smtpTransport = process.env.SMTP_URL
  ? nodemailer.createTransport(process.env.SMTP_URL)
  : process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? '587'),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth:
          process.env.SMTP_USER || process.env.SMTP_PASS
            ? {
                user: process.env.SMTP_USER ?? '',
                pass: process.env.SMTP_PASS ?? '',
              }
            : undefined,
      })
    : null;

const from =
  process.env.RESEND_FROM_ADDRESS ??
  process.env.SMTP_FROM_ADDRESS ??
  'ApexPredix AI <noreply@mail.apexpredix.ai>';

async function send(to: string, subject: string, react: ReactElement) {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const html = renderToStaticMarkup(react);
  if (!resend) {
    if (smtpTransport) {
      await smtpTransport.sendMail({ from, to, subject, html });
      return;
    }
    console.warn('[email] no mail provider configured — logging instead of sending', {
      to,
      subject,
    });
    return;
  }
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(`Resend failed: ${error.message}`);
}

export const sendVerifyEmail = (to: string, verifyUrl: string, locale: string) =>
  send(to, 'Confirm your seat on the ApexPredix AI waitlist', WaitlistVerify({ verifyUrl, locale }));

export const sendWelcomeEmail = (to: string, referralUrl: string, locale: string) =>
  send(to, 'You are on the ApexPredix AI list', WaitlistWelcome({ referralUrl, locale }));

export const sendAuthVerifyEmail = (to: string, verifyUrl: string, locale: string) =>
  send(to, 'Verify your ApexPredix AI email', AuthVerify({ verifyUrl, locale }));

export const sendAuthResetEmail = (to: string, resetUrl: string, locale: string) =>
  send(to, 'Reset your ApexPredix AI password', AuthReset({ resetUrl, locale }));
