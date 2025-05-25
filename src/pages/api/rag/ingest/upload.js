import pdfParse from 'pdf-parse';
import { connectToDatabase } from '../../../../lib/mongodb'; // Corrected path
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb'; // Needed for userId
import { getEmbeddingForQuery } from '../../../../services/ragService.js';


// Helper function for text chunking
function chunkText(text, chunkSize = 1500, chunkOverlap = 150) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    chunks.push(text.substring(i, end));
    i += chunkSize - chunkOverlap;
    if (i + chunkOverlap >= text.length && end === text.length) break; // Avoid tiny last chunk if overlap makes it so
  }
  // Ensure the last part of the text is included if the loop condition misses it
  if (i < text.length && !chunks.includes(text.substring(i))) {
      const lastChunkStart = Math.max(0, text.length - chunkSize);
      const lastChunk = text.substring(lastChunkStart);
      if (chunks.length === 0 || chunks[chunks.length -1] !== lastChunk) { // Avoid duplicate if last chunk was already added
        // Check if the new last chunk significantly overlaps with the previous one
        const previousChunk = chunks.length > 0 ? chunks[chunks.length -1] : "";
        const overlapWithPrevious = previousChunk.length > 0 ? Math.max(0, (previousChunk.length + lastChunk.length - (text.length - (i - (chunkSize - chunkOverlap)) ))) : 0;

        if (text.length <= chunkSize) { // If total text is smaller than chunksize, it's one chunk
            if (chunks.length === 0) chunks.push(text);
        } else if (chunks.length === 0 || (lastChunk.length > chunkOverlap && overlapWithPrevious < lastChunk.length * 0.8 )) {
             // Add if it's a new substantial chunk or the only chunk
            chunks.push(lastChunk);
        } else if (chunks.length > 0 && (text.length - (i-(chunkSize-chunkOverlap))) > chunkOverlap ) {
            // If the remaining part is larger than overlap, add it as a new chunk.
            chunks.push(text.substring(i-(chunkSize-chunkOverlap)));
        }
      }
  }
  return chunks.filter(chunk => chunk.trim() !== ""); // Remove empty chunks
}


export async function POST({ request, locals }) {
  if (!locals.user || !locals.user.id) {
    return new Response(JSON.stringify({ message: 'Unauthorized or user ID missing' }), { status: 401 });
  }
  const userId = locals.user.id; // Store for later use

  let formData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error('Error parsing form data:', error);
    return new Response(JSON.stringify({ message: 'Error processing request: Invalid form data.' }), { status: 400 });
  }

  const file = formData.get('file');

  if (!file) {
    return new Response(JSON.stringify({ message: 'No file uploaded.' }), { status: 400 });
  }

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ message: 'Uploaded data is not a file.' }), { status: 400 });
  }

  const fileName = file.name;
  const fileType = file.type;
  let extractedText = '';

  try {
    if (fileType === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdfData = await pdfParse(Buffer.from(arrayBuffer));
      extractedText = pdfData.text;
      console.log(`Extracted text length from PDF ${fileName}: ${extractedText.length}`);
    } else if (fileType === 'text/plain' || fileType === 'text/markdown') {
      extractedText = await file.text();
      console.log(`Extracted text length from ${fileName}: ${extractedText.length}`);
    } else {
      return new Response(
        JSON.stringify({
          message: `Unsupported file type: ${fileType}. Please upload a PDF, TXT, or MD file.`,
        }),
        { status: 415 }
      );
    }

    if (!extractedText.trim()) {
        console.warn(`No text extracted from ${fileName} (type: ${fileType}). File might be empty or unparseable.`);
        return new Response(
            JSON.stringify({ message: `No text could be extracted from ${fileName}. The file might be empty, corrupted, or in an unparseable format.` }),
            { status: 400 }
        );
    }

    const chunks = chunkText(extractedText);
    if (chunks.length === 0 && extractedText.trim().length > 0) {
        console.warn(`Text was present but chunking resulted in zero chunks for ${fileName}. Text length: ${extractedText.length}`);
        // This might happen if text is very short and only whitespace after trimming in chunker
        chunks.push(extractedText.trim()); // Add the whole text as one chunk if it's not empty
    }
    console.log(`Text from ${fileName} split into ${chunks.length} chunks.`);

    const embeddingsData = []; // Changed variable name for clarity, was 'embeddings'
    let generatedEmbeddingsCount = 0;

    if (chunks.length > 0) {
      for (const chunk of chunks) {
        if (!chunk.trim()) continue; // Skip empty chunks
        try {
          const embedding = await getEmbeddingForQuery(chunk, "RETRIEVAL_DOCUMENT");
          embeddingsData.push({
            chunkText: chunk,
            embedding: embedding,
          });
          generatedEmbeddingsCount++;
        } catch (embeddingError) {
          console.error(`RAG_INGEST_UPLOAD: Failed to generate embedding for chunk from ${fileName}. Chunk: "${chunk.substring(0, 100)}...". Error: ${embeddingError.message}`, embeddingError);
          return new Response(
            JSON.stringify({
              message: `Failed to generate embeddings for the uploaded file '${fileName}'. Error for chunk: "${chunk.substring(0,50)}..."`,
              error: embeddingError.message
            }),
            { status: 500 }
          );
        }
      }
      console.log(`RAG_INGEST_UPLOAD: Successfully generated ${generatedEmbeddingsCount} embeddings for ${chunks.length} chunks from ${fileName}.`);
    } else {
      console.log(`RAG_INGEST_UPLOAD: No chunks to process for ${fileName}.`);
      // If no chunks from a successfully parsed file, it's not an error, but nothing to store.
      return new Response(
        JSON.stringify({ message: `File processed, but no text chunks were generated from ${fileName}. Nothing to store.`, fileName }),
        { status: 200 }
      );
    }
    
    // If we've reached here, all embeddings for all chunks were generated successfully.
    if (embeddingsData.length > 0) {
      let sourceType = 'txt'; // default
      if (fileType === 'application/pdf') sourceType = 'pdf';
      else if (fileType === 'text/markdown') sourceType = 'md';

      const documentsToStore = embeddingsData.map((item, index) => ({
        userId: new ObjectId(userId),
        sourceType: sourceType,
        originalFilename: fileName,
        content: item.chunkText,
        embedding: item.embedding,
        chunkId: uuidv4(),
        metadata: {
          chunkOrder: index,
          originalSourceId: fileName,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        title: fileName,
        sourceUrl: null,
      }));

      if (documentsToStore.length > 0) {
        try {
          const { db } = await connectToDatabase();
          const result = await db.collection('knowledge_documents').insertMany(documentsToStore);
          console.log(`RAG_INGEST_UPLOAD: ${result.insertedCount} chunks inserted into knowledge_documents for user ${userId} from file ${fileName}`);
          
          const responseMessage = `File processed and content ingested successfully. ${result.insertedCount} chunks added to knowledge base.`;
          return new Response(
            JSON.stringify({
              message: responseMessage,
              fileName,
              chunksAdded: result.insertedCount,
              embeddingsGenerated: generatedEmbeddingsCount, // Should equal chunksAdded
            }),
            { status: 201 }
          );
        } catch (dbError) {
          console.error(`RAG_INGEST_UPLOAD: Database error storing chunks for ${fileName}:`, dbError);
          return new Response(
            JSON.stringify({ message: `File processed and embeddings generated, but failed to store content for '${fileName}' in knowledge base: ${dbError.message}` }),
            { status: 500 }
          );
        }
      } else {
        console.warn(`RAG_INGEST_UPLOAD: No documents were prepared for storage from ${fileName}, though embeddings were generated.`);
        return new Response(
          JSON.stringify({ message: "File processed, embeddings generated, but no content was prepared for storage.", fileName }),
          { status: 200 }
        );
      }
    } else if (chunks.length > 0 && embeddingsData.length === 0) {
      console.log(`RAG_INGEST_UPLOAD: File ${fileName} contained chunks, but none resulted in embeddings (e.g., all empty after trim).`);
      return new Response(
        JSON.stringify({ message: `File ${fileName} processed, but no valid content found in chunks to generate embeddings.`, fileName }),
        { status: 200 }
      );
    }
    // If chunks.length was 0 initially, that's handled by the text extraction logic returning 400 or the no chunks to process log.

  } catch (error) {
    // Ensure fileName is defined for the error log, even if error happens early
    const currentFileName = typeof fileName !== 'undefined' ? fileName : 'unknown file';
    console.error(`Error processing file ${currentFileName}:`, error);
    return new Response(
      JSON.stringify({ message: `Error processing file: ${error.message}` }),
      { status: 500 }
    );
  }
}