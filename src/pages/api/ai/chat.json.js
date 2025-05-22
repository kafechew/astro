// src/pages/api/ai/chat.json.js
import { getVertexAiResponse } from '../../../services/vertexAiService.js';

export async function POST(context) {
  try {
    const { message } = await context.request.json();

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return new Response(JSON.stringify({ error: 'Message cannot be empty.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await getVertexAiResponse(message);

    if (aiResponse !== null) {
      return new Response(JSON.stringify({ reply: aiResponse }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Failed to get response from AI service.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in /api/ai/chat.json.js:', error);
    // Check if it's a JSON parsing error or other client-side error
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}