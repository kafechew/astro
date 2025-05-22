// src/pages/api/askQna.json.js
import { getGeminiResponse } from '../../services/geminiService.js';

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
    // const action = 'ask'; // Unused
    // const resource = { // Unused
    //   type: 'Blog',       // Use existing 'Blog' resource type
    //   key: documentTag,   // The specific blog/document tag
    //   tenant: 'blog-tenant', // Use existing 'blog-tenant'
    // };

    // 3. Perform authorization check
    // const permitted = await permit.check(String(userId), 'ask', { type: 'Blog', key: documentTag, tenant: 'blog-tenant' }); // Permit.io check removed
    const permitted = true; // Permit.io check removed, default to permitted

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
      // console.log(`User ${userId} is not authorized.`); // Permit.io log removed
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    // 8. Handle general errors
    console.error('Error in askQna endpoint:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};