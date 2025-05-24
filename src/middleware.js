import jwt from 'jsonwebtoken';

export async function onRequest({ locals, request, cookies, redirect }, next) {
  // Astro.cookies.get() returns an AstroCookie object
  // The token value is in the .value property
  const authTokenCookie = cookies.get('authToken'); // Changed 'token' to 'authToken'
  const token = authTokenCookie?.value;

  locals.user = null; // Initialize user as null

  if (token) {
    try {
      const decoded = jwt.verify(token, import.meta.env.JWT_SECRET);
      locals.user = decoded; // Attach decoded payload (e.g., { userId, username, roles })
    } catch (err) {
      // Token verification failed (expired, invalid, etc.)
      // Clear the invalid cookie to prevent login loops or issues
      cookies.delete('authToken', { path: '/' }); // Changed 'token' to 'authToken'
      locals.user = null;
      // console.error('JWT verification error:', err.message); // Optional: log error for debugging
    }
  }

  const url = new URL(request.url);

  // Route Protection Example: Protect /api/rag/* routes
  if (url.pathname.startsWith('/api/rag/') && !locals.user) {
    return new Response(JSON.stringify({ message: 'Unauthorized: Access to RAG API requires authentication.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle logout: Clear cookie and user session, then redirect
  if (url.pathname === '/api/auth/logout') {
    if (authTokenCookie) { // Only delete if cookie exists - CHANGED tokenCookie to authTokenCookie
       cookies.delete('authToken', { path: '/' });
    }
    locals.user = null;
    // Redirect to the home page or a designated login page after logout
    return redirect('/', 302); 
  }

  // Proceed to the next middleware or route handler
  return next();
}