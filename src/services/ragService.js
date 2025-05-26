// src/services/ragService.js
import { ObjectId } from 'mongodb';
import { GoogleGenerativeAI } from "@google/generative-ai";

let genAIInstance;
let embeddingModel;

function initializeGeminiEmbeddingClient() {
  const apiKey = import.meta.env?.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("RAG_SERVICE_EMBEDDING: Missing GEMINI_API_KEY in environment variables (.env file or system env).");
    throw new Error("Missing Gemini API Key for RAG embedding. Please set GEMINI_API_KEY.");
  }

  genAIInstance = new GoogleGenerativeAI(apiKey);
  embeddingModel = genAIInstance.getGenerativeModel({ model: "text-embedding-004" });
  console.log("RAG_SERVICE_EMBEDDING: Gemini Embedding Client Initialized.");
}

/**
 * Generates an embedding for the given text using Google Gemini.
 * @param {string} text The text to embed.
 * @returns {Promise<number[]|null>} The embedding vector or null if an error occurs.
 */
export async function getEmbeddingForQuery(text) {
  if (!embeddingModel) {
    try {
      initializeGeminiEmbeddingClient();
    } catch (error) {
      console.error("RAG_SERVICE_EMBEDDING: Gemini embedding client initialization failed:", error.message);
      throw error;
    }
  }

  const cleanedText = text.replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
  if (!cleanedText) {
    console.warn("RAG_SERVICE_EMBEDDING: Text is empty after cleaning. Cannot generate embedding.");
    return null;
  }

  try {
    const result = await embeddingModel.embedContent(cleanedText);
    const embedding = result.embedding.values;
    return embedding;
  } catch (error) {
    console.error("RAG_SERVICE_EMBEDDING: Error calling Gemini Embedding API:", error);
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
      console.log(`RAG_SERVICE_FETCH_CONTEXT: Found ${relevantDocs.length} relevant documents.`);
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