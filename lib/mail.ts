import { resend } from './resend';

export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    const { data, error } = await resend.emails.send({
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

    if (error) {
      console.error("Resend API Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
};
