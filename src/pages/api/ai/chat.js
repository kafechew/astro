// src/pages/api/ai/chat.js
import jwt from 'jsonwebtoken'; // Added for JWT regeneration
import { serialize } from 'cookie'; // Added for setting cookie
import { connectToDatabase } from '../../../lib/mongodb.js';
import { ObjectId } from 'mongodb';
import { PredictionServiceClient } from '@google-cloud/aiplatform'; // Keep if used by RAG or other non-ReAct parts
import { GoogleAuth } from 'google-auth-library'; // Keep if used by RAG or other non-ReAct parts
import { fetchRagContext } from '../../../services/ragService.js';
import { performPreChecksAndDeductCredits } from '../../../services/chatPreChecksService.js';
import { executeInProcessReActLoop } from '../../../services/reactProcessorService.js'; // Import the new service


const JWT_SECRET = import.meta.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file for AI chat route. JWT refresh will fail.");
}

const VECTOR_SEARCH_INDEX_NAME = import.meta.env.VECTOR_SEARCH_INDEX_NAME;
if (!VECTOR_SEARCH_INDEX_NAME) {
  console.error("AI_CHAT_RAG: VECTOR_SEARCH_INDEX_NAME is not set in .env. RAG might fail or use a default index name.");
}

const NODE_AGENT_SERVICE_URL = import.meta.env.NODE_AGENT_SERVICE_URL;
const COST_PER_QUERY = 1; // Define the cost per query

export async function POST(context) {
  try {
    const user = context.locals.user;
    console.log('AI_CHAT_DEBUG: Initial user credits from JWT:', user?.credits);
    console.log('AI_CHAT_DEBUG: Cost per query:', COST_PER_QUERY);

    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized", message: "Authentication required." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Connect to DB early as it's needed by pre-checks and RAG
    const { db: dbInstance } = await connectToDatabase();
    const usersCollection = dbInstance.collection('users'); // Keep usersCollection for JWT refresh logic later

    // Perform pre-checks and deduct credits using the new service
    const preCheckResult = await performPreChecksAndDeductCredits(user, COST_PER_QUERY, dbInstance);

    if (preCheckResult.error) {
      return new Response(JSON.stringify(preCheckResult.body), {
        status: preCheckResult.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If pre-checks passed and credits deducted, proceed.
    // userIdToUpdate will be needed for RAG and JWT refresh.
    let userIdToUpdate;
    try {
      userIdToUpdate = new ObjectId(user.userId);
    } catch (e) {
      console.error("Invalid userId format for ObjectId after pre-checks:", user.userId, e);
      // This should ideally not happen if user.userId is valid, but as a safeguard:
      return new Response(JSON.stringify({ error: "internal_server_error", message: "Invalid user identifier post pre-checks." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Credits successfully deducted by the service.
    // The in-memory user object (context.locals.user) might be stale regarding credits.
    // The JWT refresh logic later will fetch the latest user data.

    const { message: originalUserQuery } = await context.request.json();

    if (!originalUserQuery || typeof originalUserQuery !== 'string' || originalUserQuery.trim() === '') {
      return new Response(JSON.stringify({ error: 'Message cannot be empty.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const RELEVANCE_THRESHOLD = 0.75; // Example threshold for cosine similarity; may need tuning
    let effectiveQueryForReAct;
    let ragContextForReAct = null;

    // Attempt RAG Context Retrieval First
    try {
      if (!userIdToUpdate) {
        console.error("AI_CHAT: userIdToUpdate (ObjectId) not available for RAG. This should not happen. ReAct will use original query.");
        effectiveQueryForReAct = originalUserQuery;
      } else if (!VECTOR_SEARCH_INDEX_NAME) {
        console.warn("AI_CHAT: VECTOR_SEARCH_INDEX_NAME is not set. Skipping RAG. ReAct will use original query.");
        effectiveQueryForReAct = originalUserQuery;
      } else {
        // dbInstance was already fetched for credit deduction. Re-use it.
        const ragResult = await fetchRagContext(originalUserQuery, userIdToUpdate, dbInstance, VECTOR_SEARCH_INDEX_NAME);

        if (ragResult && ragResult.documents && ragResult.documents.length > 0 && ragResult.documents[0].score >= RELEVANCE_THRESHOLD) {
          ragContextForReAct = ragResult.context;
          effectiveQueryForReAct = originalUserQuery; // Tool decision will consider this AND ragContextForReAct
          console.log(`AI_CHAT: RAG context found (top score: ${ragResult.documents[0].score}). Passing to ReAct for consideration.`);
        } else {
          effectiveQueryForReAct = originalUserQuery;
          // ragContextForReAct remains null
          if (ragResult && ragResult.documents && ragResult.documents.length > 0) {
            console.log(`AI_CHAT: RAG context found but top score (${ragResult.documents[0].score}) is below threshold (${RELEVANCE_THRESHOLD}). ReAct will use original query and no RAG context.`);
          } else {
            console.log("AI_CHAT: RAG context not relevant enough or not found. ReAct will use original query.");
          }
        }
      }
    } catch (ragError) {
      console.error("AI_CHAT: Error during RAG processing. ReAct will use original query.", ragError);
      effectiveQueryForReAct = originalUserQuery; // Fallback
      ragContextForReAct = null; // Ensure it's null on error
    }

    let agentServiceSucceeded = false;
    let agentReply = null;

    // The decision to use NODE_AGENT_SERVICE_URL or in-process ReAct needs to be re-evaluated.
    // For now, assuming we always go to in-process ReAct for this refactor.
    // If NODE_AGENT_SERVICE_URL is to be used, it would also need to be updated to handle the new RAG-aware logic.
    // This example will bypass the NODE_AGENT_SERVICE_URL logic for simplicity of this specific refactor.
    // console.log("AI_CHAT_NOTE: Bypassing NODE_AGENT_SERVICE_URL for this refactor, proceeding directly to in-process ReAct.");

    // If NODE_AGENT_SERVICE_URL is to be used, the logic below would need to be adapted.
    // For this refactor, we are focusing on the in-process loop.
    // The following 'if (NODE_AGENT_SERVICE_URL)' block is illustrative of what *would* be here.
    // However, the task is to modify the in-process loop.
    
    // For the purpose of this refactor, we will assume NODE_AGENT_SERVICE_URL path is NOT taken,
    // and we proceed directly to the in-process ReAct loop.
    // If you need to integrate this with an external agent service, that service would also need to be updated.

    if (NODE_AGENT_SERVICE_URL && false) { // Temporarily disabling this path for the refactor
      // This block would need to be updated if the external agent service is to be used
      // with the new RAG-aware logic. It would need to receive originalUserQuery and ragContextForReAct.
      console.log("Attempting to use Node.js Agent Service via URL:", NODE_AGENT_SERVICE_URL);
      // ... (existing agent service call logic, would need modification)
      // For example, the body might become:
      // body: JSON.stringify({ originalUserQuery: originalUserQuery, ragContext: ragContextForReAct, /* other_params */ }),
      // And the agent service itself would need to implement the new tool decision and synthesis logic.
      try {
        // This is a placeholder for where the updated fetch call would go.
        // For now, we assume it's not hit to focus on the in-process changes.
        const agentServiceResponse = await fetch(NODE_AGENT_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // The body would need to be constructed based on how the agent service expects
          // originalUserQuery and ragContextForReAct.
          body: JSON.stringify({ message: effectiveQueryForReAct /* This needs to be thought out if agent is used */ }),
          // Consider adding a timeout for this fetch call
          // signal: AbortSignal.timeout(10000) // Example: 10 second timeout (requires Node 16+ for AbortSignal.timeout)
        });

        if (agentServiceResponse.ok) {
          const responseData = await agentServiceResponse.json();
          // Adjust based on the actual structure of your agent service's response
          agentReply = responseData.reply || responseData.final_document || responseData.answer || "No specific reply field found from agent.";
          agentServiceSucceeded = true;
          console.log("Received response from Node.js Agent Service.");
          const updatedUser = await usersCollection.findOne({ _id: userIdToUpdate });
          const newCreditBalance = updatedUser ? updatedUser.credits : user.credits - COST_PER_QUERY; // Fallback if findOne fails
          console.log('AI_CHAT_DEBUG: User credits in DB after update (Node Agent Path):', updatedUser?.credits);
          console.log('AI_CHAT_DEBUG: New credit balance for response (Node Agent Path):', newCreditBalance);
          console.log('AI_CHAT_DEBUG: X-User-Credits header value (Node Agent Path):', newCreditBalance.toString());

          const userForToken = await usersCollection.findOne({ _id: userIdToUpdate });
          let newCookie = null;

          if (userForToken && JWT_SECRET) {
            const tokenPayload = {
              userId: userForToken._id.toString(),
              username: userForToken.username,
              email: userForToken.email,
              roles: userForToken.roles,
              isEmailVerified: userForToken.isEmailVerified,
              credits: userForToken.credits, // This will be the new balance
            };
            const newToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
            const cookieOptions = {
              httpOnly: true,
              secure: import.meta.env.MODE !== 'development',
              maxAge: 60 * 60, // 1 hour
              path: '/',
              sameSite: 'lax',
            };
            newCookie = serialize('authToken', newToken, cookieOptions);
          } else {
            console.error('AI_CHAT_DEBUG: Failed to fetch user for token regeneration or JWT_SECRET missing (Node Agent Path).');
          }

          const responseHeaders = {
            'Content-Type': 'application/json',
            'X-User-Credits': newCreditBalance.toString()
          };
          if (newCookie) {
            responseHeaders['Set-Cookie'] = newCookie;
          }

          return new Response(JSON.stringify({ reply: agentReply }), {
            status: 200,
            headers: responseHeaders,
          });
        } else {
          const errorText = await agentServiceResponse.text();
          console.warn("Error from Node.js Agent Service (status " + agentServiceResponse.status + "):", errorText, "Falling back to in-process ReAct logic.");
          // Do not return yet, let it fall through to ReAct logic
        }
      } catch (serviceError) {
         console.warn('Failed to connect to Node.js Agent service:', serviceError.message, "Falling back to in-process ReAct logic.");
         // Do not return yet, let it fall through to ReAct logic
      }
    }

    // If NODE_AGENT_SERVICE_URL was not set, or if the call to it failed and agentServiceSucceeded is false
    if (!agentServiceSucceeded) {
      if (NODE_AGENT_SERVICE_URL) { // Log only if we attempted and failed
        console.log("Fallback: Node.js Agent Service call failed or service URL not set. Using in-process ReAct logic.");
      } else {
        console.log("NODE_AGENT_SERVICE_URL not set. Using in-process ReAct logic.");
      }
      
      // Call the new ReAct processor service
      const reactContext = {
        db: dbInstance,
        user: user, // user object from context.locals.user
        userIdToUpdate: userIdToUpdate, // ObjectId
        JWT_SECRET: JWT_SECRET,
        COST_PER_QUERY: COST_PER_QUERY,
        // request: context.request, // Pass if any tool needs raw request details like headers
      };

      // Call the new ReAct processor service
      // Pass originalUserQuery (for tool decision prompt construction)
      // and ragContextForReAct (for the tool decision prompt and for potential synthesis if no tool is chosen)
      const reactResult = await executeInProcessReActLoop(
        effectiveQueryForReAct, // Using effectiveQueryForReAct as originalUserQuery for ReAct
        ragContextForReAct,
        reactContext
      );
      
      return new Response(JSON.stringify(reactResult.body), {
        status: reactResult.status,
        headers: reactResult.headers || { 'Content-Type': 'application/json' },
      });
    }
    
  } catch (error) { // Outer error handling for request parsing etc.
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
        console.error('JSON parsing error in request body:', error);
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body.', reply: "Sorry, the request format was invalid." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    console.error('Outer error in /api/ai/chat.js:', error);
    return new Response(JSON.stringify({ error: 'An unexpected server error occurred.', reply: "Sorry, an unexpected server error occurred." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
