import { sesClient } from './tencent';

export const sendVerificationEmail = async (email: string, token: string) => {
  // Use environment variable for sender address or fallback
  // Note: This address MUST be verified in Tencent Cloud SES Console
  const fromAddress = process.env.TENCENT_EMAIL_FROM || 'onboarding@tovote.top';
  // Template ID from Tencent Cloud Console
  const templateId = process.env.TENCENT_TEMPLATE_ID;

  try {
    // If we have a template ID, use Template mode
    // Otherwise try Simple mode (which might fail if no permission)
    const params: any = {
      FromEmailAddress: fromAddress,
      Destination: [email],
      Subject: 'Verify your email for Tou',
    };

    if (templateId) {
      params.Template = {
        TemplateID: parseInt(templateId),
        TemplateData: JSON.stringify({
          code: token, // Template variable is named {{code}}
        })
      };
      // Remove Subject when using Template if the template includes a subject
      // But keeping it usually doesn't hurt, or it might be overridden
    } else {
      params.Simple = {
        Html: Buffer.from(`
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Verify your email</h2>
            <p>Your verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px;">${token}</h1>
            <p>This code will expire in 15 minutes.</p>
          </div>
        `).toString('base64'),
        // Plain text fallback
        Text: Buffer.from(`Verify your email for Tou. Your verification code is: ${token}. This code will expire in 15 minutes.`).toString('base64')
      };
    }

    const data = await sesClient.SendEmail(params);

    return { success: true, data };
  } catch (error: any) {
    console.error("Tencent Cloud SES Error:", error);
    const errorMessage = error.message || String(error);
    return { success: false, error: errorMessage };
  }
};
