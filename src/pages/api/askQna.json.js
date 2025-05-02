// src/pages/api/askQna.json.js
import { Permit } from 'permitio';
import { getGeminiResponse } from '../../services/geminiService.js';

// Initialize Permit client
// Ensure PERMIT_TOKEN is set in your environment variables
const permit = new Permit({
  token: import.meta.env.PERMIT_TOKEN,
  pdp: 'https://cloudpdp.api.permit.io', // or your PDP address
});

export const POST = async ({ request }) => {
  try {
    // 1. Parse request body
    let userId, question, documentTag;
    try {
      const body = await request.json();
      userId = body.userId;
      question = body.question;
      documentTag = body.documentTag;

      if (!userId || !question || !documentTag) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required fields: userId, question, documentTag' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Define Permit.io check parameters
    // Use new 'ask' action on 'Blog' resource within 'blog-tenant'
    const action = 'ask';
    const resource = {
      type: 'Blog',       // Use existing 'Blog' resource type
      key: documentTag,   // The specific blog/document tag
      tenant: 'blog-tenant', // Use existing 'blog-tenant'
    };

    // 3. Perform authorization check
    console.log(`Checking permission for user ${userId} to perform ${action} on resource ${JSON.stringify(resource)}`);
    // Workaround for Cloud PDP limitation: Check permission on the resource *type* ('Blog')
    // instead of the specific instance (resource.key).
    // This checks if the user can 'ask' Gemini in 'blog-tenant'.
    // For specific instance checks (ReBAC), a local Docker PDP is required.
    const resourceTypeCheck = { type: resource.type, tenant: resource.tenant };
    console.log(`Checking permission for user ${userId} to perform ${action} on resource type ${JSON.stringify(resourceTypeCheck)} (Cloud PDP workaround)`);
    const permitted = await permit.check(String(userId), action, resourceTypeCheck);
    console.log(`Permission result (type level): ${permitted}`);

    // 4. Handle authorization result
    if (permitted) {
      try {
        // 5. Construct prompt and call Gemini service
        const prompt = `You are an assistant focused on answering questions strictly related to the topic: '${documentTag}'.
First, determine if the following question is related to '${documentTag}'.
- If the question IS related to '${documentTag}', answer it based on your knowledge of that topic.
- If the question IS NOT related to '${documentTag}', respond ONLY with the text: "Not related." Do not provide any other explanation or answer.

Question: "${question}"`;
        console.log(`Sending prompt to Gemini: "${prompt}"`);
        const answer = await getGeminiResponse(prompt);
        console.log(`Received answer from Gemini: "${answer}"`);

        // 6. Return success response
        return new Response(
          JSON.stringify({ success: true, answer: answer }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (geminiError) {
        console.error('Error calling Gemini service:', geminiError);
        return new Response(
          JSON.stringify({ success: false, error: 'Error getting answer from Q&A service' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // 7. Return unauthorized response
      console.log(`User ${userId} is not authorized.`);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    // 8. Handle general errors (Permit SDK, etc.)
    console.error('Error in askQna endpoint:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};