import { connectToDatabase } from '../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

const JWT_SECRET = import.meta.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file. Login functionality will not work.");
  // In a real app, you might want to prevent the app from starting or throw a more specific error.
}

export async function POST({ request }) {
  try {
    const { identifier, password } = await request.json(); // identifier can be username or email

    if (!identifier || !password) {
      return new Response(JSON.stringify({ message: 'Missing required fields (identifier, password).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Find user by email or username
    const user = await usersCollection.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      return new Response(JSON.stringify({ message: 'Invalid credentials. User not found.' }), {
        status: 401, // Unauthorized
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify password
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordMatch) {
      return new Response(JSON.stringify({ message: 'Invalid credentials. Password incorrect.' }), {
        status: 401, // Unauthorized
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!JWT_SECRET) {
        console.error('Login attempt failed: JWT_SECRET is not configured.');
        return new Response(JSON.stringify({ message: 'Login failed due to server configuration error.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    // Generate JWT
    const tokenPayload = {
      userId: user._id.toString(), // Convert ObjectId to string
      username: user.username,
      email: user.email, // Optional: include email if needed on client-side
      roles: user.roles,
      isEmailVerified: user.isEmailVerified, // Add this line
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '1h', // Token expiration time (e.g., 1 hour, 7d for 7 days)
    });

    // Set JWT as an HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: import.meta.env.MODE !== 'development', // Use secure cookies in production
      maxAge: 60 * 60, // 1 hour in seconds
      path: '/', // Cookie available for all paths
      sameSite: 'lax', // Or 'strict' or 'none' (if cross-site)
    };

    const cookie = serialize('authToken', token, cookieOptions);

    // Prepare user data to return (excluding sensitive info)
    const { passwordHash, ...userWithoutPassword } = user;

    return new Response(JSON.stringify({
      message: 'Login successful.',
      user: userWithoutPassword,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    // Check if the error is due to JWT_SECRET missing during token signing
    if (error.message && error.message.includes('secretOrPrivateKey must have a value')) {
        console.error('Critical: JWT_SECRET is likely missing or invalid when trying to sign token.');
         return new Response(JSON.stringify({ message: 'Login failed due to a server configuration issue with token signing.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return new Response(JSON.stringify({ message: 'Internal Server Error during login.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}