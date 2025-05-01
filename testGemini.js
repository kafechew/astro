// testGemini.js
import dotenv from 'dotenv';

// Load environment variables from .env file
console.log("Attempting to load .env file...");
dotenv.config();
console.log(".env file loaded (or attempted).");

// Check if the key was loaded immediately
const apiKeyFromEnv = process.env.GEMINI_API_KEY;
// Log only the first few characters for security, or undefined if not found
console.log("Value of process.env.GEMINI_API_KEY after dotenv.config():", apiKeyFromEnv ? `"${apiKeyFromEnv.substring(0, 5)}..."` : "undefined");

if (!apiKeyFromEnv) {
  console.error("Error: dotenv failed to load GEMINI_API_KEY from .env. Please check the .env file format and ensure it's in the project root.");
  process.exit(1); // Exit early if key not found
}

// If the key was found, proceed with the import and test
console.log("API key found, proceeding to import service...");
import { getGeminiResponse } from './src/services/geminiService.js';

// Simple test function
async function runTest() {
  console.log("\nTesting Gemini Service...");
  const testPrompt = "Explain the concept of asynchronous programming in JavaScript in one sentence.";

  try {
    const response = await getGeminiResponse(testPrompt);

    if (response) {
      console.log("\nGemini Response:");
      console.log("--------------------");
      console.log(response);
      console.log("--------------------");
      console.log("\nTest successful!");
    } else {
      console.error("\nTest failed: No response received or an error occurred in getGeminiResponse.");
      console.error("Please ensure your GEMINI_API_KEY in the .env file is correct and valid.");
    }
  } catch (error) {
    // Catch errors thrown by getGeminiResponse (like the initial key check)
    console.error("\nTest failed with an error:", error.message);
  }
}

// Execute the test
runTest();