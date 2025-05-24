import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET({ request, redirect }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    // Or redirect to an error page with a specific message
    return new Response(JSON.stringify({ message: 'Verification token is missing.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: new Date() }, // Check if token is not expired
    });

    if (!user) {
      // Token is invalid, not found, or expired
      // Redirect to a page indicating verification failure or token expiry
      // For now, sending a JSON response. Consider redirecting to /login?message=verification_failed
      return redirect('/login?message=verification_failed_or_expired', 302);
    }

    // Token is valid, update the user
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(user._id) },
      {
        $set: {
          isEmailVerified: true,
          emailVerificationToken: null, // Clear the token
          emailVerificationTokenExpires: null, // Clear the expiry
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
        // Should not happen if user was found, but good to check
        console.error('Failed to update user verification status for token:', token);
        return redirect('/login?message=verification_update_failed', 302);
    }

    // Successfully verified. Redirect to login page with a success message.
    // Or redirect to a dedicated "email verified, please login" page.
    return redirect('/login?message=email_verified_successfully', 302);

  } catch (error) {
    console.error('Email verification error:', error);
    // Redirect to a generic error page or login with an error message
    return redirect('/login?message=verification_error', 302);
  }
}