import { ObjectId } from 'mongodb';

/**
 * Performs pre-checks (email verification, credits) and deducts credits from the user.
 * @param {object} user - The user object from the JWT.
 * @param {number} costPerQuery - The cost of a single query.
 * @param {object} db - The MongoDB database instance.
 * @returns {Promise<{error: boolean, status?: number, body?: object, updatedUser?: object}>}
 */
export async function performPreChecksAndDeductCredits(user, costPerQuery, db) {
  if (!user) {
    // This case should ideally be handled by the caller before invoking this service.
    // However, as a safeguard:
    return {
      error: true,
      status: 401,
      body: { error: "unauthorized", message: "User not authenticated." },
    };
  }

  if (!user.isEmailVerified) {
    return {
      error: true,
      status: 403,
      body: {
        error: "email_not_verified",
        message: "Please verify your email address to use the AI chat features. Check your inbox for a verification link, or request a new one from your profile page.",
      },
    };
  }

  if (user.credits < costPerQuery) {
    return {
      error: true,
      status: 402,
      body: {
        error: "insufficient_credits",
        message: `You do not have enough credits for this query (requires ${costPerQuery}, you have ${user.credits}). Please top up your credits.`,
      },
    };
  }

  const usersCollection = db.collection('users');
  const userIdToUpdate = new ObjectId(user.userId);

  try {
    const updateResult = await usersCollection.updateOne(
      { _id: userIdToUpdate, credits: { $gte: costPerQuery } },
      { $inc: { credits: -costPerQuery } }
    );

    if (updateResult.modifiedCount === 0) {
      // This could happen if credits were spent between the initial check and the update (race condition)
      // or if the user document was not found (less likely if user object is valid)
      return {
        error: true,
        status: 409, // Conflict, as the state of the resource changed
        body: {
          error: "credit_deduction_failed",
          message: "Failed to deduct credits. This could be due to a concurrent transaction or insufficient credits. Please try again.",
        },
      };
    }

    // Optionally, fetch the updated user document if needed by the caller
    // const updatedUserDoc = await usersCollection.findOne({ _id: userIdToUpdate });
    // For now, returning success as the primary goal is deduction.
    // The caller can refresh user details if necessary (e.g., for JWT refresh).
    return { error: false }; // Or { error: false, updatedUser: updatedUserDoc }

  } catch (err) {
    console.error("Error deducting credits:", err);
    return {
      error: true,
      status: 500,
      body: {
        error: "internal_server_error",
        message: "An unexpected error occurred while deducting credits.",
      },
    };
  }
}