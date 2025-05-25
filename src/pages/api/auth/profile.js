import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(context) {
  const { request, locals } = context;

  if (!locals.user) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { displayName, bio } = body;
    const userId = locals.user.userId;

    // Basic validation
    if (displayName && typeof displayName !== 'string') {
      return new Response(JSON.stringify({ message: 'Invalid displayName' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (bio && typeof bio !== 'string') {
      return new Response(JSON.stringify({ message: 'Invalid bio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const updateFields = {};
    if (displayName !== undefined) {
      updateFields['profile.displayName'] = displayName;
    }
    if (bio !== undefined) {
      updateFields['profile.bio'] = bio;
    }

    if (Object.keys(updateFields).length === 0) {
      return new Response(JSON.stringify({ message: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    updateFields['updatedAt'] = new Date();

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the updated user document to return
    const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

    // Remove sensitive data before sending back
    delete updatedUser.password;


    return new Response(JSON.stringify({ message: 'Profile updated successfully', user: updatedUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error', error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle other methods if necessary, e.g., GET for fetching profile (though /api/auth/me might cover this)
export async function ALL(context) {
  if (context.request.method !== 'PUT') {
    return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}