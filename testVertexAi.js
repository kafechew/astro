// testVertexAi.js
import dotenv from 'dotenv';

// Load environment variables from .env file
console.log("Attempting to load .env file for Vertex AI test...");
dotenv.config();
console.log(".env file loaded (or attempted).");

// Check if necessary Google Cloud credentials were loaded
const projectId = process.env.GOOGLE_PROJECT_ID;
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY;

console.log("Value of process.env.GOOGLE_PROJECT_ID:", projectId ? `"${projectId}"` : "undefined");
console.log("Value of process.env.GOOGLE_CLIENT_EMAIL:", clientEmail ? `"${clientEmail}"` : "undefined");
console.log("Value of process.env.GOOGLE_PRIVATE_KEY:", privateKey ? `"${privateKey.substring(0, 30)}..."` : "undefined"); // Log only a snippet for security

if (!projectId || !clientEmail || !privateKey) {
  console.error("Error: dotenv failed to load one or more Google Cloud credentials (GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) from .env.");
  console.error("Please check the .env file format and ensure it's in the project root and contains these variables.");
  process.exit(1); // Exit early if keys not found
}

// If keys were found, proceed with the import and test
console.log("Google Cloud credentials found, proceeding to import Vertex AI service...");

// Simple test function
async function runVertexTest() {
  // Dynamically import here, AFTER dotenv.config() has run
  const { getVertexAiResponse } = await import('./src/services/vertexAiService.js');

  console.log("\nTesting Vertex AI Service...");
  const testPrompt = "What is Google Cloud Vertex AI? Explain in one concise sentence.";

  try {
    const response = await getVertexAiResponse(testPrompt);

    if (response !== null && response !== undefined) { // Check for null or undefined explicitly
      console.log("\nVertex AI Gemini Response:");
      console.log("---------------------------");
      console.log(response);
      console.log("---------------------------");
      console.log("\nVertex AI Test successful!");
    } else {
      console.error("\nVertex AI Test failed: No response received or an error occurred in getVertexAiResponse.");
      console.error("Please ensure your Google Cloud credentials in the .env file are correct and the service account has Vertex AI User permissions.");
    }
  } catch (error) {
    // Catch errors thrown by getVertexAiResponse (like the initial credential check)
    console.error("\nVertex AI Test failed with an error:", error.message);
    if (error.stack) {
        console.error(error.stack);
    }
  }
}

// Execute the test
runVertexTest();