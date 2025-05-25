// src/services/vertexAiService.js
import dotenv from 'dotenv';
dotenv.config(); // Load .env file into process.env

import { VertexAI } from '@google-cloud/vertexai';

let vertex_ai;
let generativeModel;

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
// The private key needs to be formatted correctly (newlines preserved).
// Astro/Vite usually handles this if the .env string is quoted correctly.
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const LOCATION = 'us-central1'; // Or make this configurable
const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

function initializeVertexAI() {
  if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    console.error("Error: Missing Google Cloud credentials (PROJECT_ID, CLIENT_EMAIL, or PRIVATE_KEY) in .env file.");
    throw new Error("Missing Google Cloud credentials.");
  }

  vertex_ai = new VertexAI({
    project: PROJECT_ID,
    location: LOCATION,
    googleAuthOptions: {
      credentials: {
        client_email: CLIENT_EMAIL,
        private_key: PRIVATE_KEY,
      },
    },
  });

  generativeModel = vertex_ai.getGenerativeModel({
    model: MODEL_NAME,
    // generation_config: { ... }, // Optional: Add generation config if needed
    // safety_settings: { ... },  // Optional: Add safety settings if needed
  });
  console.log("Vertex AI Service Initialized with model:", MODEL_NAME);
}

/**
 * Generates a response from the Vertex AI Gemini model.
 * @param {string} promptText - The input prompt text for the model.
 * @returns {Promise<string|null>} The text response from the model, or null if an error occurs.
 */
async function getVertexAiResponse(promptText) {
  if (!generativeModel) {
    try {
      initializeVertexAI();
    } catch (error) {
      console.error("Vertex AI initialization failed:", error.message);
      return null;
    }
  }

  if (!promptText) {
    console.error("Error: Prompt cannot be empty.");
    return null;
  }

  try {
    const req = {
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.1, // Force more deterministic output
        // maxOutputTokens: 2048, // Example, ensure this is present and reasonable if needed
        // topP: 0.95,
        // topK: 40,
      },
    };
    const streamingResp = await generativeModel.generateContentStream(req);
    // For non-streaming, you can use generateContent and await result.response
    // const result = await generativeModel.generateContent(req);
    // const response = result.response;
    // return response.candidates[0].content.parts[0].text;

    // Aggregate streaming response
    let aggregatedResponse = "";
    for await (const item of streamingResp.stream) {
      if (item.candidates && item.candidates[0].content && item.candidates[0].content.parts) {
        aggregatedResponse += item.candidates[0].content.parts.map(part => part.text).join("");
      }
    }
    return aggregatedResponse;

  } catch (error) {
    console.error("Error calling Vertex AI Gemini API:", error);
    return null;
  }
}

export { getVertexAiResponse };