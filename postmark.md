# hermitAI Knowledge Flow - Enhanced Implementation Plan

## 🎯 Project Vision

Transform email into a **universal AI control interface** where users can effortlessly build their knowledge base and delegate research tasks through natural email interactions. This isn't just "AI + email" - it's **"email controls AI"**.

## 🚀 Core Value Propositions

1.  **Zero-Friction Knowledge Capture**: Save anything to your AI brain via email
2.  **Universal Research Delegation**: "Hey AI, research this" from any device
3.  **Passive Intelligence Building**: Your knowledge base grows automatically
4.  **Email as AI Interface**: Revolutionary interaction paradigm

## 📋 Enhanced Implementation Plan

### Phase 1: MVP Foundation (Hackathon Ready)

#### 1.1 Postmark Infrastructure Setup

```javascript
// Postmark Configuration (Conceptual - to be stored in .env or secure config)
const postmarkConfig = {
  inboundServer: {
    name: "hermitAI-knowledge-flow",
    // Webhook URL will be your Vercel deployment + /api/email-ingest
    webhookUrl: "https://YOUR_VERCEL_DEPLOYMENT_URL/api/email-ingest", 
    authentication: {
      type: "custom-header", // Or other method Postmark supports
      header: "X-Postmark-Secret",
      value: process.env.POSTMARK_WEBHOOK_SECRET 
    }
  },
  // This is the email address users will send to.
  emailAddress: "brain@YOUR_CONFIGURED_DOMAIN.com", 
  outboundServer: { // For sending confirmations/errors
    name: "hermitAI-confirmations",
    token: process.env.POSTMARK_SERVER_TOKEN 
  }
}
```

#### 1.2 Enhanced Intent Detection System (`src/services/emailIntentService.js`)

```javascript
// src/services/emailIntentService.js
export class EmailIntentDetector {
  
  static detectIntent(subject, body, attachments = []) {
    const normalizedSubject = subject.toLowerCase().trim();
    const normalizedBody = body.toLowerCase().trim(); // Keep original case body for content extraction
    
    // 1. Emoji-based detection (highest priority)
    if (normalizedSubject.startsWith('📝') || normalizedSubject.includes('save:')) {
      return {
        intent: 'DIRECT_TEXT_INGEST',
        content: this.extractContentForNote(subject, body),
        title: this.extractTitle(subject, "Untitled Note"),
        confidence: 0.95
      };
    }
    
    if (normalizedSubject.startsWith('🔗') || normalizedSubject.includes('scrape:')) {
      const urls = this.extractUrls(subject + ' ' + body);
      if (urls.length > 0) {
        return {
          intent: 'URL_CONTENT_INGEST',
          urls: urls,
          title: this.extractTitle(subject, `Content from ${urls[0]}`),
          confidence: 0.95
        };
      }
    }
    
    if (normalizedSubject.startsWith('🔍') || normalizedSubject.includes('research:')) {
      return {
        intent: 'TRIGGER_RESEARCH',
        query: this.extractResearchQuery(subject, body),
        depth: this.extractResearchDepth(subject, body),
        title: this.extractTitle(subject, `Research on ${this.extractResearchQuery(subject, body).substring(0,50)}...`),
        confidence: 0.95
      };
    }
    
    // 2. Keyword-based detection
    const keywordPatterns = {
      save: /^(save|note|remember|store|memo):/i,
      scrape: /^(scrape|url|link|fetch|get|read):/i,
      research: /^(research|analyze|investigate|study|summarize|find out about|tell me about):/i,
      question: /^(question|ask|help|what is|how does|why is):/i
    };
    
    for (const [type, pattern] of Object.entries(keywordPatterns)) {
      if (pattern.test(normalizedSubject)) {
        return this.buildIntentFromKeyword(type, subject, body);
      }
    }
    
    // 3. Smart content analysis (if no explicit command)
    return this.analyzeContent(subject, body, attachments);
  }

  static extractContentForNote(subject, body) {
    // If body is substantial, use it. Otherwise, combine subject (minus prefix) and body.
    const cleanedSubject = subject.replace(/^(📝|save:|note:|remember:|store:|memo:)\s*/i, '').trim();
    if (body && body.trim().length > 20) {
        return body.trim();
    }
    return (cleanedSubject + (cleanedSubject && body.trim() ? "\n\n" : "") + body.trim()).trim();
  }

  static extractTitle(subject, defaultTitle = "Untitled") {
    const cleaned = subject.replace(/^(📝|🔗|🔍|save:|note:|remember:|store:|memo:|scrape:|url|link|fetch:|get:|read:|research:|analyze:|investigate:|study:|summarize:|find out about|tell me about:|question:|ask:|help:)\s*/i, '').trim();
    return cleaned || defaultTitle;
  }
  
  static extractResearchQuery(subject, body) {
    const cleanedSubject = subject.replace(/^(🔍|research:|analyze:|investigate:|study:|summarize:|find out about|tell me about:|question:|ask:|help:)\s*/i, '').trim();
    if (cleanedSubject) return cleanedSubject;
    if (body.trim()) return body.trim().substring(0, 1000); // Limit query from body
    return "General research based on email content"; // Fallback
  }

  static buildIntentFromKeyword(type, subject, body) {
    const title = this.extractTitle(subject);
    switch (type) {
        case 'save':
            return { intent: 'DIRECT_TEXT_INGEST', content: this.extractContentForNote(subject, body), title, confidence: 0.9 };
        case 'scrape':
            const urls = this.extractUrls(subject + ' ' + body);
            return { intent: 'URL_CONTENT_INGEST', urls: urls.length > 0 ? urls : this.extractUrls(body), title: title || (urls.length > 0 ? `Content from ${urls[0]}` : "Scraped Content"), confidence: 0.9 };
        case 'research':
        case 'question':
            return { intent: 'TRIGGER_RESEARCH', query: this.extractResearchQuery(subject, body), depth: this.extractResearchDepth(subject, body), title: title || `Research: ${this.extractResearchQuery(subject, body).substring(0,30)}...`, confidence: 0.9 };
        default: 
            return { intent: 'UNKNOWN', confidence: 0.1, originalSubject: subject }; 
    }
  }
  
  static analyzeContent(subject, body, attachments) {
    const urls = this.extractUrls(body);
    const questions = this.extractQuestions(body);
    const bodyTextForAnalysis = body.toLowerCase();
    const bodyLength = body.trim().length;

    if (attachments && attachments.length > 0) {
      return {
        intent: 'DOCUMENT_INGEST',
        attachments,
        title: this.extractTitle(subject, 'Email attachment ingestion'),
        confidence: 0.9
      };
    }
    
    if (urls.length > 0 && (bodyLength - urls.join('').length < 150 || bodyLength < 200 || urls.length > 2) ) {
      return {
        intent: 'URL_CONTENT_INGEST',
        urls,
        title: this.extractTitle(subject, `Web content from email`),
        confidence: 0.8
      };
    }
    
    if (questions.length > 0 || this.hasResearchIndicators(bodyTextForAnalysis)) {
      return {
        intent: 'TRIGGER_RESEARCH',
        query: this.extractTitle(subject, questions.length > 0 ? questions[0] : body.trim().substring(0, 200)),
        depth: this.extractResearchDepth(subject, body),
        confidence: 0.7
      };
    }
    
    return {
      intent: 'DIRECT_TEXT_INGEST',
      content: this.extractContentForNote(subject, body),
      title: this.extractTitle(subject, 'Email note'),
      confidence: 0.6
    };
  }
  
  static extractUrls(text) {
    if (!text) return [];
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
    return text.match(urlRegex) || [];
  }
  
  static extractQuestions(text) {
    if (!text) return [];
    const sentences = text.split(/[.!?]+/);
    return sentences.filter(s => s.trim().endsWith('?')).map(s => s.trim());
  }
  
  static hasResearchIndicators(text) {
    if (!text) return false;
    const indicators = [
      'what is', 'how does', 'why do', 'explain', 'compare',
      'analyze', 'research', 'investigate', 'find out about',
      'tell me about', 'learn about', 'understand', 'summary of'
    ];
    const lowerText = text.toLowerCase();
    return indicators.some(indicator => lowerText.includes(indicator));
  }
  
  static extractResearchDepth(subject, body) {
    const text = (subject + ' ' + body).toLowerCase();
    if (text.includes('deep dive') || text.includes('comprehensive') || text.includes('detailed analysis')) {
      return 'deep';
    }
    if (text.includes('quick summary') || text.includes('brief overview') || text.includes('tl;dr')) {
      return 'quick';
    }
    return 'standard';
  }
}
```

#### 1.3 Enhanced Email Ingestion API (`src/pages/api/email-ingest.js`)

```javascript
// src/pages/api/email-ingest.js
import { EmailIntentDetector } from '../../services/emailIntentService.js';
import { EmailProcessor } from '../../services/emailProcessorService.js'; // To be created
import { EmailResponseService } from '../../services/emailResponseService.js'; // To be created

export async function POST({ request, locals }) { // Added locals for potential future use
  const endpointStartTime = Date.now();
  try {
    // 1. Verify Postmark webhook secret
    const webhookSecret = request.headers.get('X-Postmark-Secret');
    if (webhookSecret !== process.env.POSTMARK_WEBHOOK_SECRET) {
      console.warn('POSTMARK_WEBHOOK: Invalid webhook secret. Source IP:', request.headers.get('x-forwarded-for'));
      return new Response('Unauthorized: Invalid secret.', { status: 401 });
    }
    
    // 2. Parse Postmark payload
    const payload = await request.json();
    const { From, Subject, TextBody, HtmlBody, Attachments = [], MessageID } = payload; // Added MessageID
    
    console.log(`POSTMARK_WEBHOOK: [${MessageID}] Email received from: ${From}, Subject: "${Subject}", Attachments: ${Attachments.length}`);
    
    // 3. Identify user
    const user = await EmailProcessor.identifyUser(From); // Assumes EmailProcessorService is created
    if (!user) {
      console.warn(`POSTMARK_WEBHOOK: [${MessageID}] Unknown user email: ${From}`);
      await EmailResponseService.sendUnknownUserResponse(From, MessageID); // Assumes EmailResponseService is created
      return new Response(JSON.stringify({ success: false, message: 'User not found or not verified for email ingestion.'}), { status: 403 }); // 403 Forbidden
    }
    
    // 4. Extract and clean content
    const cleanBody = TextBody || EmailProcessor.htmlToText(HtmlBody) || ''; // htmlToText in EmailProcessor
    const cleanSubject = Subject || '';
    
    // 5. Detect intent
    const intentResult = EmailIntentDetector.detectIntent(
      cleanSubject, 
      cleanBody, 
      Attachments // Pass full attachment objects
    );
    
    console.log(`POSTMARK_WEBHOOK: [${MessageID}] Intent detected for user ${user._id}: ${intentResult.intent} (Confidence: ${intentResult.confidence})`);
    
    // 6. Process based on intent
    const processingResult = await EmailProcessor.processIntent( // processIntent in EmailProcessor
      user, 
      intentResult, 
      { subject: cleanSubject, body: cleanBody, attachments: Attachments, messageId: MessageID, fromEmail: From } // Pass more email data
    );
    
    const processingTime = Date.now() - endpointStartTime;
    console.log(`POSTMARK_WEBHOOK: [${MessageID}] Processing completed in ${processingTime}ms. Result:`, processingResult);

    // 7. Send confirmation email (if enabled and successful)
    if (process.env.FEATURE_EMAIL_CONFIRMATIONS === 'true' && processingResult.status === 'success') {
      await EmailResponseService.sendConfirmation(
        From, 
        intentResult, 
        processingResult,
        MessageID
      );
    }
    
    return new Response(JSON.stringify({ 
      success: processingResult.status === 'success', 
      message: processingResult.message,
      intent: intentResult.intent,
      details: processingResult.details 
    }), {
      status: processingResult.status === 'success' ? 200 : 500, // Or more specific error codes from processor
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    const processingTime = Date.now() - endpointStartTime;
    console.error(`POSTMARK_WEBHOOK: Critical error in /api/email-ingest after ${processingTime}ms:`, error);
    
    // Try to send error notification to user if possible
    try {
      // Attempt to get 'From' if error happened after payload parsing
      let fromEmailForError = 'unknown_sender';
      if (request && typeof request.json === 'function') {
        // Avoid re-parsing if already failed or if request stream is consumed
        // This is tricky; ideally, parse once at the top.
        // For now, assume we might not have payload if initial parsing failed.
      }

      // await EmailResponseService.sendErrorResponse(fromEmailForError, error, "N/A"); // MessageID might not be available
    } catch (notificationError) {
      console.error('POSTMARK_WEBHOOK: Failed to send critical error notification email:', notificationError);
    }
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal Server Error during email processing.',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

#### 1.4 Email Processing Service (`src/services/emailProcessorService.js`)

```javascript
// src/services/emailProcessorService.js
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../lib/mongodb.js';
// Assuming ragService is correctly set up to provide getEmbeddingForQuery
// and potentially other RAG-related functions.
// For now, we'll mock or assume its existence.
// import { ragService } from './ragService.js'; // Actual import
const ragService = { // Placeholder for actual ragService
    getEmbeddingForQuery: async (text, taskType) => { /* console.log(`Mock embedding for: ${text.substring(0,30)}... (${taskType})`); */ return Array(768).fill(0.1); }
};

// Placeholder for reactProcessorService
const reactProcessorService = {
    executeInProcessReActLoop: async (prompt, ragContext, context) => {
        console.log(`Mock research for: ${prompt}`);
        return { status: 200, body: { reply: `This is a mock research summary for "${prompt}". Key findings include A, B, and C.` } };
    }
};

// Placeholder for BrightData MCP client/service
const brightDataService = {
    scrapeUrlAsMarkdown: async (url, userId) => {
        console.log(`Mock scraping URL: ${url} for user ${userId}`);
        // Simulate fetching some content
        const mockContent = `Mock content for ${url}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;
        // Simulate potential failure
        if (url.includes("failscrape")) {
            throw new Error("Mock scraping failed for this URL.");
        }
        return { success: true, markdown: mockContent, title: `Title for ${url}` };
    }
};


export class EmailProcessor {
  
  static async identifyUser(emailAddress) {
    if (!emailAddress) return null;
    const { db } = await connectToDatabase();
    // Ensure user is verified and active if such flags exist
    const user = await db.collection('users').findOne({ 
      email: emailAddress.toLowerCase(),
      // isVerified: true, // Optional: ensure user is verified
      // isActive: true    // Optional: ensure user is active
    });
    return user; // Returns user document or null
  }
  
  static htmlToText(html) {
    if (!html) return '';
    // Basic conversion, consider a library for complex HTML
    return html
      .replace(/<style([\s\S]*?)<\/style>/gi, '')
      .replace(/<script([\s\S]*?)<\/script>/gi, '')
      .replace(/<\/div>/ig, '\n')
      .replace(/<\/li>/ig, '\n')
      .replace(/<li>/ig, '  * ')
      .replace(/<\/ul>/ig, '\n')
      .replace(/<\/p>/ig, '\n')
      .replace(/<br\s*\/?>/ig, '\n')
      .replace(/<[^>]+>/ig, '')
      .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single
      .replace(/^\s+|\s+$/g, '') // Trim leading/trailing whitespace
      .replace(/&nbsp;/gi, ' ')
      .replace(/&/gi, '&')
      .replace(/"/gi, '"')
      .replace(/</gi, '<')
      .replace(/>/gi, '>');
  }
  
  static async processIntent(user, intentResult, emailData) {
    const { intent } = intentResult;
    const startTime = Date.now();
    let resultDetails = {};

    try {
        switch (intent) {
        case 'DIRECT_TEXT_INGEST':
            resultDetails = await this.processTextIngest(user, intentResult, emailData);
            break;
        case 'URL_CONTENT_INGEST':
            resultDetails = await this.processUrlIngest(user, intentResult, emailData);
            break;
        case 'TRIGGER_RESEARCH':
            resultDetails = await this.processResearchTrigger(user, intentResult, emailData);
            break;
        case 'DOCUMENT_INGEST':
            resultDetails = await this.processDocumentIngest(user, intentResult, emailData);
            break;
        default:
            console.warn(`EMAIL_PROCESSOR: Unknown intent type "${intent}" for user ${user._id}`);
            throw new Error(`Unknown or unhandled intent: ${intent}`);
        }
        return { 
            status: 'success', 
            message: `${intent} processed successfully.`, 
            details: resultDetails,
            processingTime: Date.now() - startTime 
        };
    } catch (error) {
        console.error(`EMAIL_PROCESSOR: Error processing intent ${intent} for user ${user._id}:`, error);
        return { 
            status: 'error', 
            message: `Failed to process ${intent}: ${error.message}`, 
            details: { error: error.message, ...resultDetails },
            processingTime: Date.now() - startTime
        };
    }
  }
  
  static async processTextIngest(user, intentResult, emailData) {
    const { content, title } = intentResult;
    const { subject, messageId } = emailData;
    
    const fullContent = content; // Already extracted by intent detector
    const documentTitle = title; // Already extracted
    
    const chunks = this.chunkContent(fullContent);
    const results = [];
    let successfulIngestions = 0;
    
    for (const [index, chunk] of chunks.entries()) {
      try {
        const embedding = await ragService.getEmbeddingForQuery(chunk, "RETRIEVAL_DOCUMENT");
        if (!embedding) throw new Error("Failed to generate embedding for chunk.");

        const { db } = await connectToDatabase();
        const document = {
          userId: new ObjectId(user._id),
          sourceType: 'email-note',
          title: documentTitle,
          content: chunk,
          embedding,
          metadata: {
            originalEmailSubject: subject,
            originalEmailMessageId: messageId,
            originalEmailDate: new Date(), // Consider parsing from email if available
            chunkIndex: index + 1,
            totalChunks: chunks.length
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.collection('knowledge_documents').insertOne(document);
        successfulIngestions++;
        results.push({ chunk: index + 1, status: 'success' });
      } catch (error) {
        console.error(`Error processing text chunk ${index + 1} for user ${user._id}:`, error);
        results.push({ chunk: index + 1, status: 'error', error: error.message });
      }
    }
    
    return {
      itemsProcessed: successfulIngestions,
      totalChunks: chunks.length,
      errors: chunks.length - successfulIngestions,
      details: results
    };
  }
  
  static async processUrlIngest(user, intentResult, emailData) {
    const { urls, title: defaultTitle } = intentResult;
    const { subject, messageId } = emailData;
    
    const results = [];
    let successfulIngestions = 0;

    for (const url of urls) {
      try {
        const scrapeResult = await brightDataService.scrapeUrlAsMarkdown(url, user._id.toString());
        if (!scrapeResult.success || !scrapeResult.markdown) {
            throw new Error(scrapeResult.message || `Failed to scrape content from ${url}`);
        }

        const documentTitle = defaultTitle || scrapeResult.title || subject || `Content from ${url}`;
        const chunks = this.chunkContent(scrapeResult.markdown);
        let chunksIngestedForThisUrl = 0;

        for (const [index, chunk] of chunks.entries()) {
            const embedding = await ragService.getEmbeddingForQuery(chunk, "RETRIEVAL_DOCUMENT");
            if (!embedding) throw new Error(`Failed to generate embedding for chunk from ${url}`);

            const { db } = await connectToDatabase();
            await db.collection('knowledge_documents').insertOne({
                userId: new ObjectId(user._id),
                sourceType: 'email-url-scrape',
                title: documentTitle,
                originalUrl: url,
                content: chunk,
                embedding,
                metadata: {
                    originalEmailSubject: subject,
                    originalEmailMessageId: messageId,
                    originalEmailDate: new Date(),
                    chunkIndex: index + 1,
                    totalChunks: chunks.length
                },
                createdAt: new Date(),
                updatedAt: new Date()
            });
            chunksIngestedForThisUrl++;
        }
        successfulIngestions += chunksIngestedForThisUrl > 0 ? 1 : 0; // Count URL as processed if at least one chunk is in
        results.push({ url, status: 'success', chunksIngested: chunksIngestedForThisUrl, totalChunks: chunks.length });
      } catch (error) {
        console.error(`Error processing URL ${url} for user ${user._id}:`, error);
        results.push({ url, status: 'error', error: error.message });
      }
    }
    
    return {
      itemsProcessed: successfulIngestions, // Number of URLs successfully processed (at least one chunk)
      totalUrls: urls.length,
      errors: urls.length - successfulIngestions,
      details: results
    };
  }
  
  static async processResearchTrigger(user, intentResult, emailData) {
    const { query, depth, title: researchTitle } = intentResult;
    const { subject, messageId } = emailData;
    
    try {
      const researchPrompts = {
        quick: `Provide a brief summary and key points about: "${query}"`,
        standard: `Research and provide a comprehensive overview of: "${query}". Include key facts, current developments, and relevant sources if possible.`,
        deep: `Conduct an in-depth research analysis of: "${query}". Provide detailed information, multiple perspectives, recent developments, and comprehensive source material if possible.`
      };
      const researchPrompt = researchPrompts[depth] || researchPrompts.standard;
      
      // Prepare context for reactProcessorService
      // Note: Credit deduction is handled by the main chat API, not directly here for email-triggered research.
      // We might need to adjust how credits are handled for automated tasks or assign a different cost.
      // For the hackathon, we can assume email-triggered research has a pre-defined or zero cost.
      const { db } = await connectToDatabase();
      const reactContext = {
        user: { userId: user._id.toString(), username: user.username, email: user.email, credits: user.credits }, // Pass necessary user subset
        db: db,
        // request and resHeaders might not be relevant or available in this non-HTTP context for ReAct
      };
      
      const researchResult = await reactProcessorService.executeInProcessReActLoop(
        researchPrompt,
        null, // No initial RAG context for a fresh research query
        reactContext
      );
      
      if (researchResult.status === 200 && researchResult.body && researchResult.body.reply) {
        const summary = researchResult.body.reply;
        const chunks = this.chunkContent(summary);
        let successfulChunks = 0;

        for (const [index, chunk] of chunks.entries()) {
            const embedding = await ragService.getEmbeddingForQuery(chunk, "RETRIEVAL_DOCUMENT");
            if (!embedding) throw new Error(`Failed to generate embedding for research summary chunk.`);
            
            await db.collection('knowledge_documents').insertOne({
              userId: new ObjectId(user._id),
              sourceType: 'email-research-summary',
              title: researchTitle || `Research: ${query.substring(0,50)}...`,
              originalQuery: query,
              content: chunk,
              embedding,
              metadata: {
                researchDepth: depth,
                originalEmailSubject: subject,
                originalEmailMessageId: messageId,
                originalEmailDate: new Date(),
                researchDate: new Date(),
                chunkIndex: index + 1,
                totalChunks: chunks.length
              },
              createdAt: new Date(),
              updatedAt: new Date()
            });
            successfulChunks++;
        }
        
        return {
          itemsProcessed: successfulChunks > 0 ? 1 : 0, // 1 research task processed
          errors: 0,
          details: { query, depth, summaryGenerated: true, chunksIngested: successfulChunks, totalChunks: chunks.length }
        };
      } else {
        throw new Error(`Research task failed or produced no reply. Status: ${researchResult.status}, Body: ${JSON.stringify(researchResult.body)}`);
      }
      
    } catch (error) {
      console.error(`Error processing research trigger for query "${query}", user ${user._id}:`, error);
      return {
        itemsProcessed: 0,
        errors: 1,
        details: { query, depth, error: error.message }
      };
    }
  }
  
  static async processDocumentIngest(user, intentResult, emailData) {
    const { attachments, title: defaultTitle } = intentResult;
    const { subject, messageId } = emailData;
    
    const results = [];
    let successfulIngestions = 0;

    for (const attachment of attachments) {
      try {
        const { Name, Content, ContentType, ContentLength } = attachment;
        console.log(`Processing attachment: ${Name}, Type: ${ContentType}, Size: ${ContentLength}`);

        let textContent = '';
        if (ContentType.startsWith('text/')) {
          textContent = Buffer.from(Content, 'base64').toString('utf-8');
        } else if (ContentType === 'application/pdf') {
          // Placeholder: PDF parsing needs to be re-enabled and robust
          // For now, we'll skip or log an error.
          // const pdfBuffer = Buffer.from(Content, 'base64');
          // const pdfData = await pdfParse(pdfBuffer); // Requires pdf-parse to be working
          // textContent = pdfData.text;
          console.warn(`PDF processing for ${Name} is currently disabled. Skipping attachment.`);
          results.push({ fileName: Name, status: 'skipped', reason: 'PDF processing disabled' });
          continue; // Skip this attachment
        } else {
          console.warn(`Unsupported attachment type: ${ContentType} for file ${Name}`);
          results.push({ fileName: Name, status: 'skipped', reason: 'Unsupported file type' });
          continue; // Skip this attachment
        }

        if (!textContent.trim()) {
            results.push({ fileName: Name, status: 'skipped', reason: 'No text content extracted' });
            continue;
        }

        const documentTitle = defaultTitle || subject || `Document: ${Name}`;
        const chunks = this.chunkContent(textContent);
        let chunksIngestedForThisDoc = 0;

        for (const [index, chunk] of chunks.entries()) {
            const embedding = await ragService.getEmbeddingForQuery(chunk, "RETRIEVAL_DOCUMENT");
            if (!embedding) throw new Error(`Failed to generate embedding for chunk from ${Name}`);

            const { db } = await connectToDatabase();
            await db.collection('knowledge_documents').insertOne({
                userId: new ObjectId(user._id),
                sourceType: 'email-attachment',
                title: documentTitle,
                originalFilename: Name,
                content: chunk,
                embedding,
                metadata: {
                    originalEmailSubject: subject,
                    originalEmailMessageId: messageId,
                    originalEmailDate: new Date(),
                    fileType: ContentType,
                    chunkIndex: index + 1,
                    totalChunks: chunks.length
                },
                createdAt: new Date(),
                updatedAt: new Date()
            });
            chunksIngestedForThisDoc++;
        }
        successfulIngestions += chunksIngestedForThisDoc > 0 ? 1 : 0;
        results.push({ fileName: Name, status: 'success', chunksIngested: chunksIngestedForThisDoc, totalChunks: chunks.length });
        
      } catch (error) {
        console.error(`Error processing attachment ${attachment.Name} for user ${user._id}:`, error);
        results.push({ fileName: attachment.Name, status: 'error', error: error.message });
      }
    }
    
    return {
      itemsProcessed: successfulIngestions, // Number of attachments successfully processed
      totalAttachments: attachments.length,
      errors: attachments.length - successfulIngestions,
      details: results
    };
  }
  
  static chunkContent(content, maxChunkSize = 1500) { // Increased default chunk size
    if (!content || !content.trim()) return [];
    
    // Basic sentence splitting, can be improved with more advanced NLP
    const sentences = content.match(/[^.!?]+[.!?]+(\s|$)/g) || [content]; // Split by sentences, keeping delimiters
    
    const chunks = [];
    let currentChunk = "";
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      if ((currentChunk + " " + trimmedSentence).length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        currentChunk = currentChunk ? (currentChunk + " " + trimmedSentence) : trimmedSentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [content.substring(0, maxChunkSize)]; // Ensure at least one chunk if content exists
  }
}
```

#### 1.5 Enhanced Email Response Service (`src/services/emailResponseService.js`)

```javascript
// src/services/emailResponseService.js
import { Client as PostmarkClient } from 'postmark'; // Ensure correct import

export class EmailResponseService {
  // Initialize Postmark client, ensure POSTMARK_SERVER_TOKEN is in .env
  static client = process.env.POSTMARK_SERVER_TOKEN ? new PostmarkClient(process.env.POSTMARK_SERVER_TOKEN) : null;
  static fromEmail = process.env.SMTP_FROM_EMAIL || 'brain@your-configured-domain.com'; // Use your actual domain

  static async sendConfirmation(toEmail, intentResult, processingResult, messageId) {
    if (!this.client) {
        console.warn("POSTMARK_RESPONSE: Postmark client not initialized (missing POSTMARK_SERVER_TOKEN). Cannot send confirmation.");
        return;
    }
    const { intent } = intentResult;
    const templateData = this.getTemplateData(intent, intentResult, processingResult);
    
    try {
      await this.client.sendEmail({
        From: this.fromEmail,
        To: toEmail,
        Subject: templateData.subject,
        TextBody: templateData.textBody,
        HtmlBody: templateData.htmlBody,
        MessageStream: 'outbound', // Or your specific stream for confirmations
        Headers: messageId ? [{ Name: "In-Reply-To", Value: messageId }, { Name: "References", Value: messageId }] : []
      });
      console.log(`POSTMARK_RESPONSE: [${messageId}] Confirmation email sent to: ${toEmail} for intent: ${intent}`);
    } catch (error) {
      console.error(`POSTMARK_RESPONSE: [${messageId}] Failed to send confirmation email to ${toEmail}:`, error);
    }
  }
  
  static getTemplateData(intent, intentResult, processingResult) {
    // Using a more dynamic approach for templates
    let subject, textBody, htmlContent;
    const baseTitle = intentResult.title || "Your hermitAI Update";

    switch(intent) {
        case 'DIRECT_TEXT_INGEST':
            subject = `📝 Note Ingested: "${baseTitle}"`;
            textBody = `Your note titled "${baseTitle}" has been successfully ingested into hermitAI.\n\nChunks processed: ${processingResult.details?.itemsProcessed || processingResult.itemsProcessed}/${processingResult.details?.totalChunks || processingResult.totalChunks}.\nErrors: ${processingResult.details?.errors || processingResult.errors}.`;
            htmlContent = `<p>Your note titled "<strong>${baseTitle}</strong>" has been successfully ingested.</p><p>Chunks processed: ${processingResult.details?.itemsProcessed || processingResult.itemsProcessed}/${processingResult.details?.totalChunks || processingResult.totalChunks}. Errors: ${processingResult.details?.errors || processingResult.errors}.</p>`;
            break;
        case 'URL_CONTENT_INGEST':
            subject = `🔗 URL Content Ingested: "${baseTitle}"`;
            textBody = `Content from ${processingResult.details?.itemsProcessed || processingResult.itemsProcessed} URL(s) (out of ${processingResult.details?.totalUrls || intentResult.urls.length}) related to "${baseTitle}" has been ingested.\nErrors: ${processingResult.details?.errors || processingResult.errors}.`;
            htmlContent = `<p>Content from <strong>${processingResult.details?.itemsProcessed || processingResult.itemsProcessed}</strong> URL(s) (out of ${processingResult.details?.totalUrls || intentResult.urls.length}) related to "<strong>${baseTitle}</strong>" has been ingested.</p><p>Errors: ${processingResult.details?.errors || processingResult.errors}.</p>`;
            // Could list URLs and their status from processingResult.details.details
            break;
        case 'TRIGGER_RESEARCH':
            subject = `🔍 Research Processed: "${intentResult.query}"`;
            textBody = `Research on "${intentResult.query}" (depth: ${intentResult.depth}) has been processed.\nSummary ingested: ${processingResult.details?.summaryGenerated ? 'Yes' : 'No'}.\nChunks: ${processingResult.details?.chunksIngested || 0}/${processingResult.details?.totalChunks || 0}.\nErrors: ${processingResult.errors || 0}.`;
            htmlContent = `<p>Research on "<strong>${intentResult.query}</strong>" (depth: ${intentResult.depth}) has been processed.</p><p>Summary ingested: ${processingResult.details?.summaryGenerated ? 'Yes' : 'No'}. Chunks: ${processingResult.details?.chunksIngested || 0}/${processingResult.details?.totalChunks || 0}.</p><p>Errors: ${processingResult.errors || 0}.</p>`;
            if (processingResult.details?.summaryGenerated) {
                htmlContent += `<h3>Summary Preview:</h3><p>${(processingResult.details.researchSummary || "").substring(0,300)}...</p>`;
            }
            break;
        case 'DOCUMENT_INGEST':
            subject = `📄 Document(s) Processed: "${baseTitle}"`;
            textBody = `${processingResult.details?.itemsProcessed || processingResult.itemsProcessed} out of ${processingResult.details?.totalAttachments || intentResult.attachments.length} attachments related to "${baseTitle}" processed.\nErrors: ${processingResult.details?.errors || processingResult.errors}.`;
            htmlContent = `<p><strong>${processingResult.details?.itemsProcessed || processingResult.itemsProcessed}</strong> out of ${processingResult.details?.totalAttachments || intentResult.attachments.length} attachments related to "<strong>${baseTitle}</strong>" processed.</p><p>Errors: ${processingResult.details?.errors || processingResult.errors}.</p>`;
            // Could list attachment names and status
            break;
        default:
            subject = `❓ Unknown Action Processed: "${baseTitle}"`;
            textBody = `An email with subject "${baseTitle}" was processed with an unknown intent. Please check your hermitAI logs.`;
            htmlContent = `<p>An email with subject "<strong>${baseTitle}</strong>" was processed with an unknown intent. Please check your hermitAI logs.</p>`;
    }

    textBody += `\n\nView your knowledge base: ${process.env.APP_BASE_URL}/ai\n\n-- hermitAI Knowledge Flow`;
    htmlContent = this.generateHtmlTemplate(subject, htmlContent);

    return { subject, textBody, htmlBody };
  }
  
  static generateHtmlTemplate(title, content) {
    // ... (HTML template structure from postmark.md, ensure APP_BASE_URL is used) ...
    return `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:sans-serif;max-width:600px;margin:auto;padding:20px;}.header{background:#f0f0f0;padding:10px;text-align:center;}h2{color:#333;}</style></head><body><div class="header"><h1>hermitAI</h1></div><h2>${title}</h2>${content}<p>Access your <a href="${process.env.APP_BASE_URL || 'http://localhost:4321'}/ai">hermitAI dashboard</a>.</p></body></html>`;
  }
  
  static async sendErrorResponse(toEmail, error, messageId) {
    if (!this.client) { console.warn("POSTMARK_RESPONSE: Postmark client not initialized. Cannot send error response."); return; }
    const subject = '❌ Error Processing Your Email to hermitAI';
    const textBody = `Sorry, there was an error processing your email (ID: ${messageId || 'N/A'}).\n\nError: ${error.message}\n\nPlease try again or contact support if the issue persists.\n\n-- hermitAI`;
    const htmlContent = `<p>Sorry, there was an error processing your email (ID: ${messageId || 'N/A'}).</p><p><strong>Error:</strong> ${error.message}</p><p>Please try again or contact support.</p>`;
    
    try {
      await this.client.sendEmail({
        From: this.fromEmail, To: toEmail, Subject: subject, TextBody: textBody, HtmlBody: this.generateHtmlTemplate(subject, htmlContent), MessageStream: 'outbound'
      });
      console.log(`POSTMARK_RESPONSE: [${messageId}] Error notification email sent to: ${toEmail}`);
    } catch (emailError) {
      console.error(`POSTMARK_RESPONSE: [${messageId}] Failed to send error notification email to ${toEmail}:`, emailError);
    }
  }
  
  static async sendUnknownUserResponse(toEmail, messageId) {
    if (!this.client) { console.warn("POSTMARK_RESPONSE: Postmark client not initialized. Cannot send unknown user response."); return; }
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:4321';
    const subject = '🔐 hermitAI Account Required for Email Ingestion';
    const textBody = `Hello!\n\nWe received an email from ${toEmail} (ID: ${messageId || 'N/A'}), but this email address isn't associated with an active hermitAI account.\n\nTo use hermitAI Knowledge Flow, please:\n1. Create an account at ${appBaseUrl}/register\n2. Verify your email address.\n3. Then, you can send knowledge to ${this.fromEmail}.\n\n-- hermitAI`;
    const htmlContent = `<p>Hello!</p><p>We received an email from <strong>${toEmail}</strong> (ID: ${messageId || 'N/A'}), but this email address isn't associated with an active hermitAI account.</p><p>To use hermitAI Knowledge Flow, please:</p><ol><li><a href="${appBaseUrl}/register">Create an account</a></li><li>Verify your email address.</li><li>Then, you can send knowledge to <strong>${this.fromEmail}</strong>.</li></ol>`;

    try {
      await this.client.sendEmail({
        From: this.fromEmail, To: toEmail, Subject: subject, TextBody: textBody, HtmlBody: this.generateHtmlTemplate(subject, htmlContent), MessageStream: 'outbound'
      });
      console.log(`POSTMARK_RESPONSE: [${messageId}] Unknown user email sent to: ${toEmail}`);
    } catch (error) {
      console.error(`POSTMARK_RESPONSE: [${messageId}] Failed to send unknown user response to ${toEmail}:`, error);
    }
  }
}
```

### Phase 2 & 3: (As detailed in the user's enhanced plan - Email Threading, Content Enhancement, Analytics, Security, Templating, etc.)
These will be implemented after the MVP is stable.

This updated [`postmark.md`](postmark.md:1) now reflects the very detailed and ambitious plan you've laid out.