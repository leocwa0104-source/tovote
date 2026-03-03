import { Resend } from 'resend';

// Using the key from your .env file
const key = 're_MQuQHmBo_L6TjsGKkMd9Cmh66JKfGL7sD';
const resend = new Resend(key);

async function test() {
  console.log('Attempting to send test email from onboarding@tovote.top');
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@tovote.top',
      to: 'delivered@resend.dev', // Resend's test sink
      subject: 'Domain Verification Test',
      html: '<p>If you see this, tovote.top is verified!</p>'
    });

    if (error) {
      console.error('Resend API Error:', error);
      if (error.name === 'validation_error') {
         console.log('\nPossible reason: Domain not verified yet. Go to https://resend.com/domains to verify.');
      }
    } else {
      console.log('Success! Email sent. ID:', data.id);
    }
  } catch (err) {
    console.error('Unexpected Error:', err);
  }
}

test();
