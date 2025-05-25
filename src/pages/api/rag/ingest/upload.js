// import pdfParse from 'pdf-parse';
import { connectToDatabase } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getEmbeddingForQuery } from '../../../../services/ragService.js';
import crypto from 'crypto'; // Added for crypto.randomUUID()

// Helper function to process PDF buffer and create structured chunks (updated based on example)
/*
async function processPDFChunks(pdfBuffer, originalFilename) {
    try {
        // const data = await pdfParse(pdfBuffer); // Use the buffer

        // if (!data.text || !data.text.trim()) {
        //     console.warn(`No text extracted from PDF ${originalFilename} by processPDFChunks.`);
        //     return [];
        // }

        // const MAX_CHUNK_SIZE = 1000; // characters, from example
        // const chunks = [];
        // const pagesText = data.text.split(/\f/); // Split by form feed (new page)

        // for (let i = 0; i < pagesText.length; i++) {
        //     const pageText = pagesText[i].replace(/\s+/g, ' ').trim();
        //     if (!pageText) continue;

        //     for (let j = 0; j < pageText.length; j += MAX_CHUNK_SIZE) {
        //         chunks.push({
        //             content: pageText.substring(j, j + MAX_CHUNK_SIZE),
        //             metadata: {
        //                 page_number: i + 1,
        //                 originalSourceId: originalFilename,
        //             }
        //         });
        //     }
        // }
        // return chunks;
        return []; // Return empty array as the function is commented out
    } catch (error) {
        console.error(`Error parsing PDF ${originalFilename}:`, error);
        throw new Error(`Failed to parse PDF "${originalFilename}": ${error.message}`);
    }
}
*/

export async function POST({ request, locals }) {
    if (!locals.user || !locals.user.id) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized or user ID missing' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const userId = locals.user.id;

    // PDF upload functionality is temporarily disabled.
    return new Response(
        JSON.stringify({
            success: false,
            message: "PDF upload functionality is temporarily disabled."
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } } // 503 Service Unavailable
    );

    /*
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const title = formData.get('title'); // New: get title from form data

        if (!file || !(file instanceof File)) {
            return new Response(JSON.stringify({ success: false, message: "No file uploaded or invalid file data." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const originalFilename = file.name;

        // PDF Upload functionality is temporarily disabled.
        // if (file) { // If any file is uploaded, return the disabled message.
        //     return new Response(JSON.stringify({ success: false, message: "PDF upload functionality is temporarily disabled. Please try again later." }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        // }
        
        // This endpoint will now focus on PDF processing as per the conceptual change.
        // For other file types, separate endpoints or logic would be needed if this is a replacement.
        // if (file.type !== 'application/pdf') {
        //     return new Response(JSON.stringify({ success: false, message: "Unsupported file type. This endpoint currently only supports PDF files." }), { status: 415, headers: { 'Content-Type': 'application/json' } });
        // }

        // const fileBuffer = await file.arrayBuffer();
        // const pdfNodeBuffer = Buffer.from(fileBuffer);

        // const chunks = await processPDFChunks(pdfNodeBuffer, originalFilename); // This will now use the commented out version

        // if (!chunks || chunks.length === 0) {
        //     // If processPDFChunks is fully commented out and returns [], this will always be true.
        //     // We've already returned a 503 if a file was present.
        //     // This path should ideally not be reached if a file was uploaded.
        //     // However, to be safe, if it somehow is, let's indicate no processing occurred.
        //      return new Response(JSON.stringify({ success: false, message: "No content processed. PDF functionality disabled." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        // }

        // const { db } = await connectToDatabase();
        // const knowledgeDocumentsCollection = db.collection('knowledge_documents');
        // let processedCount = 0;

        // for (const chunk of chunks) {
        //     if (!chunk.content || !chunk.content.trim()) {
        //         console.warn(`RAG_INGEST_UPLOAD: Skipping empty chunk from ${originalFilename}.`);
        //         continue;
        //     }
        //     const embedding = await getEmbeddingForQuery(chunk.content, "RETRIEVAL_DOCUMENT");
        //     if (embedding) {
        //         await knowledgeDocumentsCollection.insertOne({
        //             userId: new ObjectId(userId),
        //             sourceType: 'pdf', // Hardcoded to 'pdf' as per conceptual change focus
        //             originalFilename: originalFilename,
        //             title: title || originalFilename, // Use form title or fallback to filename
        //             content: chunk.content,
        //             embedding: embedding,
        //             metadata: chunk.metadata,
        //             chunkId: crypto.randomUUID(),
        //             createdAt: new Date(),
        //             updatedAt: new Date(),
        //         });
        //         processedCount++;
        //     } else {
        //         console.warn(`RAG_INGEST_UPLOAD: Failed to generate embedding for a chunk from ${originalFilename}. Skipping chunk.`);
        //     }
        // }
        
        // if (processedCount === 0 && chunks.length > 0) { // chunks will be []
        //      return new Response(JSON.stringify({ success: false, message: "Extracted content but failed to generate embeddings for any chunk (PDF disabled)." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        // }
        // if (processedCount === 0 && chunks.length === 0) {
        //     return new Response(JSON.stringify({ success: false, message: "No content was extracted or processed (PDF disabled)." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        // }

        // console.log(`RAG_INGEST_UPLOAD: Successfully ingested ${processedCount} chunks from ${originalFilename} for user ${userId}.`);
        // return new Response(JSON.stringify({ success: true, message: `${processedCount} chunks from ${originalFilename} ingested successfully (PDF processing part is disabled).` }), { status: 201, headers: { 'Content-Type': 'application/json' } });
        // Fallback if no file was provided in the first place (should be caught by earlier check on line 53)
        return new Response(JSON.stringify({ success: false, message: "No file provided or PDF processing is disabled." }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error("RAG_INGEST_UPLOAD: Error processing file upload:", error);
        // Try to get filename for logging, if available
        let fName = "unknown file";
        try {
            const tempFormData = await request.clone().formData(); // Clone request to read formData again if needed
            const tempFile = tempFormData.get('file');
            if (tempFile && typeof tempFile !== 'string') fName = tempFile.name;
        } catch (e) { // ignore if can't get filename
 }

        return new Response(JSON.stringify({ success: false, message: error.message || `Server error during file upload for ${fName}.` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    */
}
