import { Resend } from 'resend';

// Use a dummy key if RESEND_API_KEY is missing to prevent build/runtime crash
// The actual email sending will fail gracefully if the key is invalid
const apiKey = process.env.RESEND_API_KEY || 're_123456789';

export const resend = new Resend(apiKey);
