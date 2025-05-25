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
    let queryToSendToLLM;
    let forceToolNameToReact = null; // Changed from forceNoTool to be more explicit

    // Attempt RAG Context Retrieval First
    try {
      if (!userIdToUpdate) {
        console.error("AI_CHAT: userIdToUpdate (ObjectId) not available for RAG. This should not happen. Proceeding with original query for LLM.");
        queryToSendToLLM = originalUserQuery;
        // forceToolNameToReact remains null
      } else if (!VECTOR_SEARCH_INDEX_NAME) {
        console.warn("AI_CHAT: VECTOR_SEARCH_INDEX_NAME is not set. Skipping RAG. Proceeding with original query for LLM.");
        queryToSendToLLM = originalUserQuery;
        // forceToolNameToReact remains null
      } else {
        // dbInstance was already fetched for credit deduction. Re-use it.
        const ragResult = await fetchRagContext(originalUserQuery, userIdToUpdate, dbInstance, VECTOR_SEARCH_INDEX_NAME);

        if (ragResult && ragResult.documents && ragResult.documents.length > 0 && ragResult.documents[0].score >= RELEVANCE_THRESHOLD) {
          // Highly relevant RAG context found
          queryToSendToLLM = `ROLE: You are hermitAI.
TASK: You MUST answer using ONLY the information in the "Context from Knowledge Base" below.
WARNING: Your training data may contain general information, but you MUST IGNORE it completely for this task.
IMPORTANT: If the answer is in the context, quote it directly. Do not modify, interpret, or add to it.

Context from Knowledge Base:
---
${ragResult.context}
---

Original Query:
${originalUserQuery}

Your answer (ONLY from the context provided):`;
          forceToolNameToReact = "none";
          console.log(`AI_CHAT: Highly relevant RAG context found (top score: ${ragResult.documents[0].score}). Forcing direct synthesis.`);
        } else {
          // RAG context not found or not relevant enough
          queryToSendToLLM = originalUserQuery;
          forceToolNameToReact = null; // Allow ReAct to decide tool
          if (ragResult && ragResult.documents && ragResult.documents.length > 0) {
            console.log(`AI_CHAT: RAG context found but top score (${ragResult.documents[0].score}) is below threshold (${RELEVANCE_THRESHOLD}). Proceeding to tool decision/general synthesis.`);
          } else {
            console.log("AI_CHAT: No relevant RAG context found. Proceeding to tool decision/general synthesis.");
          }
        }
      }
    } catch (ragError) {
      console.error("AI_CHAT: Error during RAG processing. Proceeding with original query for LLM.", ragError);
      queryToSendToLLM = originalUserQuery; // Fallback
      forceToolNameToReact = null; // Ensure it's null on error
    }

    let agentServiceSucceeded = false;
    let agentReply = null;

    console.log("AI_CHAT_FINAL_PROMPT: Sending to LLM:", queryToSendToLLM);
    if (NODE_AGENT_SERVICE_URL) {
      console.log("Attempting to use Node.js Agent Service via URL:", NODE_AGENT_SERVICE_URL);
      try {
        const agentServiceResponse = await fetch(NODE_AGENT_SERVICE_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            // Add any other headers your agent service might expect, e.g., API keys
          },
          body: JSON.stringify({ message: queryToSendToLLM /*, other_params_if_needed */ }),
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

      // Pass originalUserQuery for tool decision, and queryToSendToLLM for synthesis
      // Also pass forceNoTool to potentially bypass tool decision in ReAct loop
      const reactResult = await executeInProcessReActLoop(originalUserQuery, queryToSendToLLM, reactContext, forceToolNameToReact);
      
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
