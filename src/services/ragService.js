// src/services/ragService.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ObjectId } from 'mongodb'; // Required if userId needs conversion, but plan is to pass ObjectId

/**
 * Generates an embedding for the given text using Google Generative AI.
 * @param {string} text The text to embed.
 * @param {string} taskType The task type for the embedding model (e.g., "RETRIEVAL_DOCUMENT", "RETRIEVAL_QUERY").
 * @returns {Promise<number[]|null>} The embedding vector or null if an error occurs.
 */
export async function getEmbeddingForQuery(text, taskType = "RETRIEVAL_DOCUMENT") {
  const apiKey = import.meta.env.GEMINI_API_KEY; // Or GOOGLE_API_KEY
  if (!apiKey) {
    console.error("RAG_SERVICE_EMBEDDING: GEMINI_API_KEY is not set in .env.");
    throw new Error("API key for embedding service is not configured.");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "models/text-embedding-004" }); // Using "models/text-embedding-004"

    const cleanedText = text.replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
    if (!cleanedText) {
      console.warn("RAG_SERVICE_EMBEDDING: Text is empty after cleaning. Cannot generate embedding.");
      return null; // Or throw an error
    }

    // Based on user's hermiteam example for "embedding-001"
    // and common usage for this model with @google/generative-ai
    const result = await model.embedContent({
      content: { parts: [{ text: cleanedText }] }, // Corrected structure for newer models
      taskType: taskType // e.g., "RETRIEVAL_DOCUMENT", "RETRIEVAL_QUERY", "SEMANTIC_SIMILARITY", "CLASSIFICATION", "CLUSTERING"
    });
    
    const embedding = result.embedding;
    if (embedding && embedding.values && Array.isArray(embedding.values)) {
      return embedding.values;
    }

    console.error("RAG_SERVICE_EMBEDDING: Invalid response structure from embedding model ('models/text-embedding-004'). Response:", JSON.stringify(result));
    throw new Error("Failed to get valid embedding values from 'models/text-embedding-004' model.");

  } catch (error) {
    console.error(`RAG_SERVICE_EMBEDDING: Error calling Google Generative AI embedContent for model "models/text-embedding-004":`, error.message);
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
    const userQueryEmbedding = await getEmbeddingForQuery(userQuery, "RETRIEVAL_QUERY");

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