import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL } = import.meta.env;

let transporter;

if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASSWORD && SMTP_FROM_EMAIL) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: parseInt(SMTP_PORT, 10) === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });

  transporter.verify((error, _success) => {
    if (error) {
      console.error('Email transporter configuration error:', error);
    } else {
      console.log('Email transporter is configured correctly and ready to send emails.');
    }
  });

} else {
  console.warn(
    'SMTP environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL) are not fully configured. Email sending will be disabled.'
  );
}

/**
 * Sends a verification email to the user.
 * @param {string} to - The recipient's email address.
 * @param {string} username - The recipient's username.
 * @param {string} token - The email verification token.
 * @param {string} origin - The base URL of the application (e.g., http://localhost:4321)
 */
export async function sendVerificationEmail(to, username, token, origin) {
  if (!transporter) {
    console.error('Email transporter is not configured. Cannot send verification email.');
    // In a real app, you might want to throw an error or handle this more gracefully
    return Promise.reject(new Error('Email service not configured.'));
  }

  const verificationLink = `${origin}/api/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: SMTP_FROM_EMAIL,
    to: to,
    subject: 'Verify Your Email Address',
    text: `Hello ${username},\n\nPlease verify your email address by clicking on the following link, or by pasting it into your browser:\n\n${verificationLink}\n\nIf you did not request this, please ignore this email.\n\nThanks,\nThe Team`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Hello ${username},</h2>
        <p>Please verify your email address by clicking on the link below:</p>
        <p><a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email Address</a></p>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
        <p>If you did not create an account, please ignore this email.</p>
        <hr>
        <p>Thanks,<br>The Team</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Example of how to get the origin in an Astro API endpoint:
// const origin = new URL(request.url).origin;