import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET({ locals, redirect }) {
  const jwtUser = locals.user;

  if (!jwtUser || !jwtUser.userId) {
    return new Response(JSON.stringify({ message: "Unauthorized - No valid session found" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const dbUser = await usersCollection.findOne({ _id: new ObjectId(jwtUser.userId) });

    if (!dbUser) {
      return new Response(JSON.stringify({ message: "Unauthorized - User not found in database" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Prepare user data to return, ensuring it's fresh from the DB
    const userDetails = {
      userId: dbUser._id.toString(),
      username: dbUser.username,
      email: dbUser.email,
      roles: dbUser.roles,
      isEmailVerified: dbUser.isEmailVerified,
      credits: dbUser.credits,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
      // Add any other non-sensitive fields you want to return
    };

    return new Response(JSON.stringify(userDetails), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });

  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}