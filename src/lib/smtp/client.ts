/**
 * SMTP client wrapper built on top of nodemailer.
 *
 * Design goals:
 *  - Create a new transporter per send operation to keep this stateless.
 *  - Verify connection before sending so errors surface early.
 *  - Fully typed options and results.
 */

import nodemailer, { type Transporter, type SendMailOptions } from "nodemailer";
import { decrypt } from "@/lib/crypto";
import type { MailAccount } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailAddress {
  address: string;
  name?: string;
}

export interface SendEmailOptions {
  from?: EmailAddress; // Defaults to the account's email + display name
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  inReplyTo?: string;   // Message-ID of the email being replied to
  references?: string[]; // List of Message-IDs for thread context
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType: string;
    contentDisposition?: "attachment" | "inline";
    cid?: string; // Content-ID for inline images
  }>;
  headers?: Record<string, string>; // Additional custom headers
}

export interface SendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAddress(a: EmailAddress): string {
  if (a.name) {
    return `"${a.name.replace(/"/g, '\\"')}" <${a.address}>`;
  }
  return a.address;
}

function formatAddresses(addresses: EmailAddress[]): string {
  return addresses.map(formatAddress).join(", ");
}

// ---------------------------------------------------------------------------
// Transport factory
// ---------------------------------------------------------------------------

/**
 * Create a nodemailer transporter for the given mail account.
 * Decrypts the stored password before configuring the transport.
 */
export function createTransport(account: MailAccount): Transporter {
  const password = decrypt(account.encryptedPassword);

  return nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSecure, // true = TLS on connect (port 465)
    auth: {
      user: account.username,
      pass: password,
    },
    // Sane timeouts
    connectionTimeout: 10_000, // 10s
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------

/**
 * Send an email using the given account's SMTP configuration.
 *
 * Verifies the SMTP connection before sending to surface configuration errors
 * immediately rather than after a long timeout.
 */
export async function sendEmail(
  account: MailAccount,
  options: SendEmailOptions
): Promise<SendResult> {
  const transporter = createTransport(account);

  // Verify connection before attempting to send
  try {
    await transporter.verify();
  } catch (err) {
    throw new Error(
      `SMTP connection verification failed for account ${account.email}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const fromAddress: EmailAddress = options.from ?? {
    address: account.email,
    name: account.name,
  };

  const mailOptions: SendMailOptions = {
    from: formatAddress(fromAddress),
    to: formatAddresses(options.to),
    subject: options.subject,
    html: options.bodyHtml,
    text: options.bodyText,
  };

  if (options.cc?.length) {
    mailOptions.cc = formatAddresses(options.cc);
  }
  if (options.bcc?.length) {
    mailOptions.bcc = formatAddresses(options.bcc);
  }
  if (options.replyTo) {
    mailOptions.replyTo = formatAddress(options.replyTo);
  }
  if (options.inReplyTo) {
    mailOptions.inReplyTo = options.inReplyTo;
  }
  if (options.references?.length) {
    mailOptions.references = options.references.join(" ");
  }
  if (options.attachments?.length) {
    mailOptions.attachments = options.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
      contentDisposition: a.contentDisposition ?? "attachment",
      cid: a.cid,
    }));
  }
  if (options.headers) {
    mailOptions.headers = options.headers;
  }

  const info = await transporter.sendMail(mailOptions);

  return {
    messageId: info.messageId,
    accepted: Array.isArray(info.accepted)
      ? info.accepted.map(String)
      : [],
    rejected: Array.isArray(info.rejected)
      ? info.rejected.map(String)
      : [],
    response: info.response,
  };
}

/**
 * Verify that the SMTP credentials for a mail account are valid.
 * Useful when the user first adds an account.
 */
export async function verifySmtpConnection(account: MailAccount): Promise<{
  ok: boolean;
  error?: string;
}> {
  const transporter = createTransport(account);
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
