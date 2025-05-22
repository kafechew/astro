// src/services/geminiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

let genAIInstance;
let modelInstance;

function initializeGemini() {
  // Retrieve the Gemini API key, checking both import.meta.env (Astro/Vite) and process.env (Node)
  const apiKey = import.meta.env?.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;

  // Check if the API key exists
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is not defined in environment variables (.env file or system env).");
    throw new Error("Missing Gemini API Key. Please set GEMINI_API_KEY in your .env file or environment.");
  }

  // Initialize the GoogleGenerativeAI client
  genAIInstance = new GoogleGenerativeAI(apiKey);

  // Get the generative model instance
  modelInstance = genAIInstance.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });

  console.log("Gemini Service Initialized."); // Added for confirmation
}

/**
 * Generates a response from the Gemini model based on the provided prompt.
 * @param {string} prompt - The input prompt for the model.
 * @returns {Promise<string|null>} The text response from the model, or null if an error occurs.
 */
async function getGeminiResponse(prompt) {
  // Initialize the client and model on the first call
  if (!modelInstance) {
    try {
      initializeGemini();
    } catch (error) {
      // If initialization fails (e.g., missing key), return null or rethrow
      console.error("Gemini initialization failed:", error.message);
      return null;
    }
  }

  if (!prompt) {
    console.error("Error: Prompt cannot be empty.");
    return null;
  }

  try {
    const result = await modelInstance.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Depending on requirements, you might return a specific error message
    // or re-throw the error for higher-level handling.
    return null; // Return null or a generic error message
  }
}

// Export the function
export { getGeminiResponse };