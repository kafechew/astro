import { connectToDatabase } from '../../../../lib/mongodb.js';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import { executeScrapeMarkdown } from '../../../../lib/ai-tools/scrapeMarkdownTool.js'; // For scraping
import { getEmbeddingForQuery } from '../../../../services/ragService.js';

// Helper function for text chunking (Copied from upload.js)
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

// Helper function to extract title from Markdown (simple approach)
function extractTitleFromMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') return null;
  const match = markdown.match(/^#\s+(.*)/m); // Look for the first H1 header
  return match ? match[1].trim() : null;
}


export async function POST({ request, locals }) {
  if (!locals.user || !locals.user.userId) { // Corrected to locals.user.userId
    return new Response(JSON.stringify({ message: 'Unauthorized or user ID missing' }), { status: 401 });
  }
  const userId = locals.user.userId; // Corrected to locals.user.userId

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    console.error('Error parsing JSON body:', error);
    return new Response(JSON.stringify({ message: 'Invalid JSON body.' }), { status: 400 });
  }

  const { url: targetUrl } = requestBody;

  if (!targetUrl) {
    return new Response(JSON.stringify({ message: 'URL is required.' }), { status: 400 });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol.');
    }
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Invalid URL format. Must be a valid HTTP/HTTPS URL.' }), { status: 400 });
  }

  const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
  const brightDataZone = process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE || 'mcp_unlocker'; // Fallback zone

  if (!brightDataApiToken) {
    console.error("BrightData API token not configured for URL ingestion.");
    return new Response(JSON.stringify({ message: 'Scraping service not configured (missing API token).' }), { status: 503 });
  }

  let scrapedMarkdown = '';
  try {
    console.log(`Attempting to scrape URL: ${targetUrl}`);
    scrapedMarkdown = await executeScrapeMarkdown(targetUrl, brightDataApiToken, brightDataZone);
    if (scrapedMarkdown.startsWith('Error:')) {
        console.error(`Scraping failed for ${targetUrl}: ${scrapedMarkdown}`);
        return new Response(JSON.stringify({ message: `Failed to scrape content from URL: ${scrapedMarkdown}` }), { status: 502 }); // Bad Gateway
    }
    console.log(`Successfully scraped content from ${targetUrl}. Length: ${scrapedMarkdown.length}`);
  } catch (scrapeError) {
    console.error(`Error scraping URL ${targetUrl}:`, scrapeError);
    return new Response(JSON.stringify({ message: `Error during scraping process: ${scrapeError.message}` }), { status: 500 });
  }

  if (!scrapedMarkdown || !scrapedMarkdown.trim()) {
    console.warn(`No content scraped from ${targetUrl}.`);
    return new Response(JSON.stringify({ message: 'No content could be extracted from the URL.' }), { status: 400 });
  }

  const pageTitle = extractTitleFromMarkdown(scrapedMarkdown) || targetUrl.split('/').pop() || 'Untitled';

  const chunks = chunkText(scrapedMarkdown);
  if (chunks.length === 0 && scrapedMarkdown.trim().length > 0) {
      chunks.push(scrapedMarkdown.trim());
  }
  console.log(`Text from ${targetUrl} split into ${chunks.length} chunks.`);

  const embeddingsData = []; // Changed variable name
  let generatedEmbeddingsCount = 0;

  if (chunks.length > 0) {
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      try {
        const embedding = await getEmbeddingForQuery(chunk); // taskType removed
        embeddingsData.push({
          chunkText: chunk,
          embedding: embedding,
        });
        generatedEmbeddingsCount++;
      } catch (embeddingError) {
        console.error(`RAG_INGEST_URL: Failed to generate embedding for chunk from ${targetUrl}. Chunk: "${chunk.substring(0, 100)}...". Error: ${embeddingError.message}`, embeddingError);
        return new Response(
          JSON.stringify({
            message: `Failed to generate embeddings for the content from URL '${targetUrl}'. Error for chunk: "${chunk.substring(0,50)}..."`,
            error: embeddingError.message
          }),
          { status: 500 }
        );
      }
    }
    console.log(`RAG_INGEST_URL: Successfully generated ${generatedEmbeddingsCount} embeddings for ${chunks.length} chunks from ${targetUrl}.`);
  } else {
    console.log(`RAG_INGEST_URL: No chunks to process for ${targetUrl}.`);
    // If no chunks from successfully scraped content, it's not an error, but nothing to store.
    return new Response(
      JSON.stringify({ message: `URL processed, but no text chunks were generated from ${targetUrl}. Nothing to store.`, sourceUrl: targetUrl, title: pageTitle }),
      { status: 200 }
    );
  }

  // If we've reached here, all embeddings for all chunks were generated successfully.
  if (embeddingsData.length > 0) {
    const originalFilename = targetUrl.substring(targetUrl.lastIndexOf('/') + 1) || pageTitle.replace(/\s+/g, '_') + ".md";
    const documentsToStore = embeddingsData.map((item, index) => ({
      userId: new ObjectId(userId),
      sourceType: "url",
      sourceUrl: targetUrl,
      originalFilename: originalFilename,
      title: pageTitle,
      content: item.chunkText,
      embedding: item.embedding,
      chunkId: uuidv4(), // Using uuidv4 for consistency
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
        console.log(`RAG_INGEST_URL: ${result.insertedCount} chunks inserted into knowledge_documents for user ${userId} from URL ${targetUrl}`);
        
        const responseMessage = `URL content scraped, processed, and ingested successfully. ${result.insertedCount} chunks added.`;
        return new Response(
          JSON.stringify({
            message: responseMessage,
            sourceUrl: targetUrl,
            chunksAdded: result.insertedCount,
            embeddingsGenerated: generatedEmbeddingsCount, // Should equal chunksAdded
            title: pageTitle,
          }),
          { status: 201 }
        );
      } catch (dbError) {
        console.error(`RAG_INGEST_URL: Database error storing chunks for ${targetUrl}:`, dbError);
        return new Response(
          JSON.stringify({ message: `URL content processed and embeddings generated, but failed to store content for '${targetUrl}' in knowledge base: ${dbError.message}` }),
          { status: 500 }
        );
      }
    } else {
      console.warn(`RAG_INGEST_URL: No documents were prepared for storage from ${targetUrl}, though embeddings were generated.`);
      return new Response(
        JSON.stringify({ message: "URL content processed, embeddings generated, but no content was prepared for storage.", sourceUrl: targetUrl, title: pageTitle }),
        { status: 200 }
      );
    }
  } else if (chunks.length > 0 && embeddingsData.length === 0) {
    console.log(`RAG_INGEST_URL: URL ${targetUrl} content yielded chunks, but none resulted in embeddings (e.g., all empty after trim).`);
    return new Response(
      JSON.stringify({ message: `URL ${targetUrl} processed, but no valid content found in chunks to generate embeddings.`, sourceUrl: targetUrl, title: pageTitle }),
      { status: 200 }
    );
  }
  // If chunks.length was 0 initially, that's handled by the scraping logic returning 400 or the no chunks to process log.
}