import { connectToDatabase } from '../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export async function POST({ request }) {
  try {
    const { username, email, password } = await request.json();

    // Basic Input Validation
    if (!username || !email || !password) {
      return new Response(JSON.stringify({ message: 'Missing required fields (username, email, password).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ message: 'Password must be at least 6 characters long.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Plausible email format check (very basic)
    if (!/\S+@\S+\.\S+/.test(email)) {
        return new Response(JSON.stringify({ message: 'Invalid email format.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Check for existing user
    const existingUser = await usersCollection.findOne({
      $or: [{ username: username }, { email: email }],
    });

    if (existingUser) {
      let message = 'User already exists.';
      if (existingUser.username === username && existingUser.email === email) {
        message = 'Username and email already exist.';
      } else if (existingUser.username === username) {
        message = 'Username already exists.';
      } else if (existingUser.email === email) {
        message = 'Email already exists.';
      }
      return new Response(JSON.stringify({ message }), {
        status: 409, // Conflict
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10); // 10 is the salt rounds

    // Create user
    const newUser = {
      username,
      email,
      passwordHash,
      roles: ['user'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    if (!result.insertedId) {
        return new Response(JSON.stringify({ message: 'Failed to create user.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Auto-login: Generate JWT and set cookie
    const JWT_SECRET = import.meta.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('Registration: JWT_SECRET is not configured. Cannot auto-login user.');
      // Still return success for registration, but without auto-login
      return new Response(JSON.stringify({ message: 'User registered successfully, but auto-login failed due to server configuration.' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userForToken = {
      userId: result.insertedId.toString(),
      username: newUser.username,
      email: newUser.email,
      roles: newUser.roles,
    };

    const token = jwt.sign(userForToken, JWT_SECRET, {
      expiresIn: '1h', // Token expiration time
    });

    const cookieOptions = {
      httpOnly: true,
      secure: import.meta.env.MODE !== 'development',
      maxAge: 60 * 60, // 1 hour in seconds
      path: '/',
      sameSite: 'lax',
    };

    const cookie = serialize('authToken', token, cookieOptions);

    // Prepare user data to return (excluding sensitive info)
    const userForResponse = { ...newUser };
    delete userForResponse.passwordHash;
    // Add the _id to the returned user object, ensuring it's a string if needed by client
    userForResponse._id = result.insertedId.toString();


    return new Response(JSON.stringify({
      message: 'User registered successfully and logged in.',
      user: userForResponse,
    }), {
      status: 201, // Created
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error during registration.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}