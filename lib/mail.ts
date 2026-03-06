import { sesClient } from './tencent';

export const sendVerificationEmail = async (email: string, token: string) => {
  // Use environment variable for sender address or fallback
  // Note: This address MUST be verified in Tencent Cloud SES Console
  let fromAddress = 'ToVote <onboarding@tovote.top>';
  
  const envFrom = process.env.TENCENT_EMAIL_FROM;
  if (envFrom) {
    // If env var contains '<', assume it already includes a name (e.g. "Name <email@domain.com>")
    if (envFrom.includes('<')) {
      fromAddress = envFrom;
    } else {
      // If just an email, add the "ToVote" name
      fromAddress = `ToVote <${envFrom}>`;
    }
  }
  // Template ID from Tencent Cloud Console
  const templateId = process.env.TENCENT_TEMPLATE_ID;

  try {
    type SendEmailParams = Parameters<(typeof sesClient)['SendEmail']>[0]
    // If we have a template ID, use Template mode
    // Otherwise try Simple mode (which might fail if no permission)
    const params: SendEmailParams = {
      FromEmailAddress: fromAddress,
      Destination: [email],
      Subject: 'Verify your email for ToVote',
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
            <h2>Verify your email for ToVote</h2>
            <p>Your verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px;">${token}</h1>
            <p>This code will expire in 15 minutes.</p>
          </div>
        `).toString('base64'),
        // Plain text fallback
        Text: Buffer.from(`Verify your email for ToVote. Your verification code is: ${token}. This code will expire in 15 minutes.`).toString('base64')
      };
    }

    const data = await sesClient.SendEmail(params);

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Tencent Cloud SES Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
};
