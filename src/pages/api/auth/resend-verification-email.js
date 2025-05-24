import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { sendVerificationEmail } from '../../../lib/emailService';

export async function POST({ request, locals }) {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized. Please log in.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Fetch the latest user data from DB to ensure status is current
    const dbUser = await usersCollection.findOne({ _id: new ObjectId(user.userId) });

    if (!dbUser) {
      // This should ideally not happen if locals.user is set from a valid token
      return new Response(JSON.stringify({ message: 'User not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (dbUser.isEmailVerified) {
      return new Response(JSON.stringify({ message: 'Your email is already verified.' }), {
        status: 400, // Bad Request, as the action is not needed
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate new verification token and expiry
    const newVerificationToken = crypto.randomBytes(32).toString('hex');
    const newVerificationTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Update user in DB with the new token
    await usersCollection.updateOne(
      { _id: new ObjectId(dbUser._id) },
      {
        $set: {
          emailVerificationToken: newVerificationToken,
          emailVerificationTokenExpires: newVerificationTokenExpires,
          updatedAt: new Date(),
        },
      }
    );

    // Send the new verification email
    try {
      const origin = new URL(request.url).origin;
      await sendVerificationEmail(dbUser.email, dbUser.username, newVerificationToken, origin);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      // Even if email sending fails, the token was updated.
      // You might want to inform the user that token was reset but email failed.
      return new Response(JSON.stringify({ message: 'Verification token has been reset, but there was an error sending the email. Please try again shortly or contact support.' }), {
        status: 500, // Internal Server Error for email part
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'A new verification email has been sent. Please check your inbox.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Resend verification email error:', error);
    return new Response(JSON.stringify({ message: 'An internal server error occurred. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}