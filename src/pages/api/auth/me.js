export async function GET({ locals, redirect }) {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Exclude sensitive information like passwordHash
  const { passwordHash, ...userDetails } = user;

  return new Response(JSON.stringify(userDetails), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}