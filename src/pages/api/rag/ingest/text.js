import { connectToDatabase } from '../../../../lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import { getEmbeddingForQuery } from '../../../../services/ragService.js';

// Helper function for text chunking (consistent with upload.js and url.js)
function chunkText(text, chunkSize = 1500, chunkOverlap = 150) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    chunks.push(text.substring(i, end));
    i += chunkSize - chunkOverlap;
    if (i + chunkOverlap >= text.length && end === text.length) break; 
  }
  if (i < text.length && !chunks.includes(text.substring(i))) {
      const lastChunkStart = Math.max(0, text.length - chunkSize);
      const lastChunk = text.substring(lastChunkStart);
      if (chunks.length === 0 || chunks[chunks.length -1] !== lastChunk) {
        const previousChunk = chunks.length > 0 ? chunks[chunks.length -1] : "";
        const overlapWithPrevious = previousChunk.length > 0 ? Math.max(0, (previousChunk.length + lastChunk.length - (text.length - (i - (chunkSize - chunkOverlap)) ))) : 0;

        if (text.length <= chunkSize) {
            if (chunks.length === 0) chunks.push(text);
        } else if (chunks.length === 0 || (lastChunk.length > chunkOverlap && overlapWithPrevious < lastChunk.length * 0.8 )) {
            chunks.push(lastChunk);
        } else if (chunks.length > 0 && (text.length - (i-(chunkSize-chunkOverlap))) > chunkOverlap ) {
            chunks.push(text.substring(i-(chunkSize-chunkOverlap)));
        }
      }
  }
  return chunks.filter(chunk => chunk.trim() !== "");
}


export async function POST({ request, locals }) {
  if (!locals.user || !locals.user.userId) { // Check Astro.locals.user and Astro.locals.user.userId
    return new Response(JSON.stringify({ message: 'Unauthorized or user ID missing' }), { status: 401 });
  }
  const userId = locals.user.userId; // Use Astro.locals.user.userId

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    console.error('Error parsing JSON body:', error);
    return new Response(JSON.stringify({ message: 'Error processing request: Invalid JSON body.' }), { status: 400 });
  }

  const { title: requestTitle, text } = requestBody;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return new Response(JSON.stringify({ message: 'Missing or empty "text" field in request body.' }), { status: 400 });
  }

  const documentTitle = requestTitle || "Text Input"; // Default title if not provided

  try {
    const chunks = chunkText(text);
    if (chunks.length === 0 && text.trim().length > 0) {
        console.warn(`Text was present but chunking resulted in zero chunks for direct text input. Text length: ${text.length}`);
        chunks.push(text.trim()); 
    }
    console.log(`Direct text input split into ${chunks.length} chunks.`);

    const embeddingsData = [];
    let generatedEmbeddingsCount = 0;

    if (chunks.length > 0) {
      for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        try {
          const embedding = await getEmbeddingForQuery(chunk, "RETRIEVAL_DOCUMENT");
          // Since getEmbeddingForQuery now throws on error, we only proceed if it's successful.
          // The 'else' case for a null embedding is no longer needed here as an error would have been thrown.
          embeddingsData.push({
            chunkText: chunk,
            embedding: embedding,
          });
          generatedEmbeddingsCount++;
        } catch (embeddingError) {
          console.error(`RAG_INGEST_TEXT: Failed to generate embedding for chunk. Chunk: "${chunk.substring(0, 100)}...". Error: ${embeddingError.message}`, embeddingError);
          // If any chunk fails to get an embedding, we stop processing and return an error.
          return new Response(
            JSON.stringify({
              message: `Failed to generate embeddings for the provided content. Error for chunk: "${chunk.substring(0,50)}..."`,
              error: embeddingError.message
            }),
            { status: 500 }
          );
        }
      }
      console.log(`RAG_INGEST_TEXT: Successfully generated ${generatedEmbeddingsCount} embeddings for ${chunks.length} text chunks.`);
    } else {
      console.log("RAG_INGEST_TEXT: No chunks to process for direct text input.");
      // If there were no chunks from non-empty text, it's not an error, but nothing to store.
      return new Response(
        JSON.stringify({ message: "Text processed, but no text chunks were generated. Nothing to store.", title: documentTitle }),
        { status: 200 }
      );
    }

    // If we've reached here, all embeddings for all chunks were generated successfully.
    if (embeddingsData.length > 0) {
      const documentsToStore = embeddingsData.map((item, index) => ({
        userId: new ObjectId(userId),
        sourceType: "text",
        sourceUrl: null,
        originalFilename: null,
        title: documentTitle,
        content: item.chunkText,
        embedding: item.embedding, // Should always be present if we reach here
        chunkId: uuidv4(),
        metadata: {
          chunk_index: index,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      if (documentsToStore.length > 0) {
        try {
          const { db } = await connectToDatabase();
          const result = await db.collection('knowledge_documents').insertMany(documentsToStore);
          console.log(`RAG_INGEST_TEXT: ${result.insertedCount} chunks inserted into knowledge_documents for user ${userId} from direct text input.`);
          
          const responseMessage = `Text content processed and ingested successfully. ${result.insertedCount} chunks added.`;
          return new Response(
            JSON.stringify({
              message: responseMessage,
              title: documentTitle,
              chunksAdded: result.insertedCount,
              embeddingsGenerated: generatedEmbeddingsCount, // This should equal chunksAdded
            }),
            { status: 201 }
          );
        } catch (dbError) {
          console.error(`RAG_INGEST_TEXT: Database error storing chunks for direct text input:`, dbError);
          return new Response(
            JSON.stringify({ message: `Text processed and embeddings generated, but failed to store content in knowledge base: ${dbError.message}` }),
            { status: 500 }
          );
        }
      } else {
        // This case should ideally not be reached if embeddingsData.length > 0.
        // It implies chunks were processed, embeddings generated, but no documents prepared.
        console.warn(`RAG_INGEST_TEXT: No documents were prepared for storage from direct text input, though embeddings were generated.`);
        return new Response(
          JSON.stringify({ message: "Text processed, embeddings generated, but no content was prepared for storage.", title: documentTitle }),
          { status: 200 }
        );
      }
    } else if (chunks.length > 0 && embeddingsData.length === 0) {
      // This case implies there were chunks, but for some reason (e.g. all were empty after trim) no embeddings were processed.
      // The loop for embeddings would have handled errors, so this is more about empty valid chunks.
      console.log("RAG_INGEST_TEXT: Text contained chunks, but none resulted in embeddings (e.g., all empty after trim).");
      return new Response(
        JSON.stringify({ message: "Text processed, but no valid content found in chunks to generate embeddings.", title: documentTitle }),
        { status: 200 }
      );
    }
    // If chunks.length was 0 initially, that's handled above.

  } catch (error) {
    console.error(`Error processing direct text input:`, error);
    return new Response(
      JSON.stringify({ message: `Error processing direct text input: ${error.message}` }),
      { status: 500 }
    );
  }
}