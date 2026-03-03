import { resend } from './resend';

export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    await resend.emails.send({
      from: 'Tou App <onboarding@tovote.top>', 
      to: email,
      subject: 'Verify your email for Tou',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Verify your email</h2>
          <p>Your verification code is:</p>
          <h1 style="font-size: 32px; letter-spacing: 5px;">${token}</h1>
          <p>This code will expire in 15 minutes.</p>
        </div>
      `
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error: "Failed to send email" };
  }
};
