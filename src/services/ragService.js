// src/services/ragService.js
import aiplatform from '@google-cloud/aiplatform';
import { ObjectId } from 'mongodb'; // Required if userId needs conversion, but plan is to pass ObjectId
// import { GoogleAuth } from 'google-auth-library'; // Potentially needed for explicit auth

const { PredictionServiceClient } = aiplatform.v1;
const { helpers } = aiplatform; // Import helpers

// Initialize dotenv to load .env file into import.meta.env for Astro
// Note: Astro typically handles .env files automatically, but explicit initialization can be robust.
// If issues arise, ensure .env variables are prefixed with PUBLIC_ for client-side or accessible server-side.
// For server-side code like this, direct access should work.
// import dotenv from 'dotenv'; // Not standard in Astro's ESM environment for services like this.
// dotenv.config(); // Astro handles .env loading.

const GOOGLE_CLOUD_PROJECT_ID = import.meta.env.GOOGLE_PROJECT_ID; // Astro uses import.meta.env
const GOOGLE_CLIENT_EMAIL = import.meta.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = import.meta.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_CLOUD_LOCATION = import.meta.env.GOOGLE_CLOUD_LOCATION || 'us-central1'; // Default if not set

let predictionServiceClient;

function initializeVertexAIClient() {
  if (!GOOGLE_CLOUD_PROJECT_ID || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_CLOUD_LOCATION) {
    console.error("RAG_SERVICE_EMBEDDING: Missing Google Cloud credentials (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY, or LOCATION) in .env file.");
    throw new Error("Missing Google Cloud credentials for Vertex AI.");
  }

  const clientOptions = {
    apiEndpoint: `${GOOGLE_CLOUD_LOCATION}-aiplatform.googleapis.com`,
    // Credentials for PredictionServiceClient are typically handled by GOOGLE_APPLICATION_CREDENTIALS env var.
    // For explicit service account key usage:
    // const auth = new GoogleAuth({
    //   credentials: {
    //     client_email: GOOGLE_CLIENT_EMAIL,
    //     private_key: GOOGLE_PRIVATE_KEY,
    //   },
    //   scopes: 'https://www.googleapis.com/auth/cloud-platform',
    // });
    // clientOptions.auth = auth; // This would require importing GoogleAuth
    // However, the @google-cloud/aiplatform library might pick up credentials if set in a way it expects,
    // or if the higher-level VertexAI class (if used) handles it.
    // For PredictionServiceClient, if GOOGLE_APPLICATION_CREDENTIALS is not set,
    // explicit auth might be needed or ensure the library can construct it from individual env vars.
    // The VertexAI class in vertexAiService.js shows direct credential passing.
    // Let's assume for now that if GOOGLE_APPLICATION_CREDENTIALS is not set,
    // we might need to construct auth explicitly or ensure the library handles these env vars.
    // For simplicity and to align with common patterns, we'll rely on implicit auth first.
    // If explicit auth is needed, the GoogleAuth snippet would be used.
  };

  // If using explicit credentials with PredictionServiceClient (more robust if GOOGLE_APPLICATION_CREDENTIALS isn't set up)
  // This mirrors how VertexAI class is often initialized with explicit credentials.
  if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY) {
    clientOptions.credentials = {
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    };
  }

  predictionServiceClient = new PredictionServiceClient(clientOptions);
  console.log("RAG_SERVICE_EMBEDDING: PredictionServiceClient Initialized for Vertex AI embeddings.");
}

/**
 * Generates an embedding for the given text using Google Cloud Vertex AI.
 * @param {string} text The text to embed.
 * @returns {Promise<number[]|null>} The embedding vector or null if an error occurs.
 */
export async function getEmbeddingForQuery(text, _taskType) {
  if (!predictionServiceClient) {
    try {
      initializeVertexAIClient();
    } catch (error) {
      console.error("RAG_SERVICE_EMBEDDING: Vertex AI client initialization failed:", error.message);
      throw error; // Re-throw to indicate failure
    }
  }

  const cleanedText = text.replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
  if (!cleanedText) {
    console.warn("RAG_SERVICE_EMBEDDING: Text is empty after cleaning. Cannot generate embedding.");
    return null;
  }

  const modelId = "text-embedding-004"; // Or "textembedding-gecko@003" or other compatible model
  const endpoint = `projects/${GOOGLE_CLOUD_PROJECT_ID}/locations/${GOOGLE_CLOUD_LOCATION}/publishers/google/models/${modelId}`;

  const instances = [
    helpers.toValue({
        content: cleanedText
    })
  ];
  const parameters = helpers.toValue({ autoTruncate: true });

  try {
    const [response] = await predictionServiceClient.predict({ endpoint, instances, parameters });

    if (response && response.predictions && response.predictions.length > 0) {
        const prediction = response.predictions[0]; // This is a Struct
        if (prediction && prediction.structValue && prediction.structValue.fields && prediction.structValue.fields.embeddings) {
            const embeddingsProto = prediction.structValue.fields.embeddings;
            if (embeddingsProto.structValue && embeddingsProto.structValue.fields && embeddingsProto.structValue.fields.values) {
                const valuesProto = embeddingsProto.structValue.fields.values;
                if (valuesProto.listValue && valuesProto.listValue.values) {
                    return valuesProto.listValue.values.map(v => v.numberValue);
                }
            }
        }
    }
    console.error("RAG_SERVICE_EMBEDDING: Invalid response structure or no embeddings found from Vertex AI PredictionService. Response:", JSON.stringify(response));
    throw new Error("Failed to get valid embedding from Vertex AI PredictionService.");

  } catch (error) {
    console.error(`RAG_SERVICE_EMBEDDING: Error calling Vertex AI PredictionService for model "${modelId}":`, error.message);
    if (error.stack) console.error(error.stack);
    throw error;
  }
}

/**
 * Fetches relevant context from the knowledge base using RAG.
 * @param {string} userQuery The user's original query.
 * @param {ObjectId} userId The ObjectId of the user performing the query.
 * @param {object} db The MongoDB database instance.
 * @param {string} vectorSearchIndexName The name of the vector search index.
 * @returns {Promise<{context: string, relevantDocs: any[]}|null>} An object containing the retrieved context and documents, or null if an error occurs or no context is found.
 */
export async function fetchRagContext(userQuery, userId, db, vectorSearchIndexName) {
  if (!userQuery || !userId || !db || !vectorSearchIndexName) {
    console.error("RAG_SERVICE_FETCH_CONTEXT: Missing required parameters (userQuery, userId, db, vectorSearchIndexName).");
    return null;
  }

  try {
    console.log("RAG_SERVICE_FETCH_CONTEXT: Attempting RAG processing for user:", userId.toString());
    const userQueryEmbedding = await getEmbeddingForQuery(userQuery); // taskType removed

    if (!userQueryEmbedding) {
      console.log("RAG_SERVICE_FETCH_CONTEXT: Embedding generation failed or returned null. Cannot proceed with RAG.");
      return null;
    }

    console.log("RAG_SERVICE_FETCH_CONTEXT: Embedding generated successfully.");
    const knowledgeDocumentsCollection = db.collection('knowledge_documents');

    const pipeline = [
      {
        $vectorSearch: {
          index: vectorSearchIndexName,
          path: 'embedding',
          queryVector: userQueryEmbedding,
          numCandidates: 100,
          limit: 3,
          filter: { userId: userId } // userId should already be an ObjectId
        }
      },
      {
        $project: {
          _id: 0,
          content: 1,
          sourceType: 1,
          originalFilename: 1,
          sourceUrl: 1,
          title: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ];

    const relevantDocs = await knowledgeDocumentsCollection.aggregate(pipeline).toArray();
    console.log(`RAG_SERVICE_FETCH_CONTEXT: Number of relevant documents found: ${relevantDocs ? relevantDocs.length : 0}`);

    if (relevantDocs && relevantDocs.length > 0) {
      console.log(`RAG_SERVICE_FETCH_CONTEXT: Found \${relevantDocs.length} relevant documents.`);
      const retrievedContext = relevantDocs.map(doc => doc.content).join("\n\n");
      console.log("RAG_SERVICE_FETCH_CONTEXT: Retrieved context snippet:", retrievedContext.substring(0, 200) + (retrievedContext.length > 200 ? "..." : ""));
      return { context: retrievedContext, documents: relevantDocs };
    } else {
      console.log("RAG_SERVICE_FETCH_CONTEXT: No relevant documents found.");
      return { context: null, documents: [] }; // Return null context and empty documents array if no docs
    }
  } catch (error) {
    console.error("RAG_SERVICE_FETCH_CONTEXT: Error during RAG processing:", error);
    return null;
  }
}