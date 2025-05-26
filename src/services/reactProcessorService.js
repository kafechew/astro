import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { getVertexAiResponse } from './vertexAiService.js';
import { getGeminiResponse } from './geminiService.js'; // Import Gemini service for fallback

// Import AI tool execution functions
import { executeSearchEngine } from '../lib/ai-tools/searchEngineTool.js';
import { executeScrapeMarkdown } from '../lib/ai-tools/scrapeMarkdownTool.js';
import { executeScrapeHtml } from '../lib/ai-tools/scrapeHtmlTool.js';
import { executeGetLinkedInProfile } from '../lib/ai-tools/linkedinProfileTool.js';
import { executeGetAmazonProduct } from '../lib/ai-tools/amazonProductTool.js';
import { executeGetAmazonProductReviews } from '../lib/ai-tools/amazonProductReviewsTool.js';
import { executeGetLinkedInCompanyProfile } from '../lib/ai-tools/linkedinCompanyProfileTool.js';
import { executeGetZoominfoCompanyProfile } from '../lib/ai-tools/zoominfoCompanyProfileTool.js';
import { executeGetInstagramProfile } from '../lib/ai-tools/instagramProfileTool.js';
import { executeGetInstagramPosts } from '../lib/ai-tools/instagramPostsTool.js';
import { executeGetInstagramReels } from '../lib/ai-tools/instagramReelsTool.js';
import { executeGetInstagramComments } from '../lib/ai-tools/instagramCommentsTool.js';
import { executeGetFacebookPosts } from '../lib/ai-tools/facebookPostsTool.js';
import { executeGetFacebookMarketplaceListings } from '../lib/ai-tools/facebookMarketplaceListingsTool.js';
import { executeGetFacebookCompanyReviews } from '../lib/ai-tools/facebookCompanyReviewsTool.js';
import { executeSessionStats } from '../lib/ai-tools/sessionStatsTool.js';
import { executeGetXPosts } from '../lib/ai-tools/xPostsTool.js';
import { executeGetZillowPropertiesListing } from '../lib/ai-tools/zillowPropertiesListingTool.js';
import { executeGetBookingHotelListings } from '../lib/ai-tools/bookingHotelListingsTool.js';
import { executeGetYoutubeVideos } from '../lib/ai-tools/youtubeVideosTool.js';

const availableTools = [
    {
        name: "search_engine",
        description: "Performs a web search using Google, Bing, or Yandex. Useful for finding general information, current events, or specific websites. Requires a search query.",
        arguments: {
            query: "string (the search query)",
            engine: "string (optional, 'google', 'bing', or 'yandex', defaults to 'google')"
        }
    },
    {
        name: "scrape_as_markdown",
        description: "Scrapes a single webpage URL and returns its content as Markdown. Useful for extracting textual content from articles or blogs. Requires a URL.",
        arguments: {
            url: "string (the URL of the webpage to scrape)"
        }
    },
    {
        name: "scrape_as_html",
        description: "Scrapes a single webpage URL and returns its full HTML content. Useful when the structure or specific HTML elements are important. Requires a URL.",
        arguments: {
            url: "string (the URL of the webpage to scrape)"
        }
    },
    {
        name: "web_data_linkedin_person_profile",
        description: "Quickly read structured LinkedIn person profile data. Requires a valid LinkedIn profile URL.",
        arguments: {
            url: "string (the LinkedIn profile URL)"
        }
    },
    {
        name: "web_data_amazon_product",
        description: "Quickly read structured Amazon product data. Requires a valid product URL with /dp/ in it.",
        arguments: {
            url: "string (the Amazon product URL)"
        }
    },
    {
        name: "web_data_amazon_product_reviews",
        description: "Quickly read structured Amazon product review data. Requires a valid product URL with /dp/ in it.",
        arguments: {
            url: "string (the Amazon product URL for reviews)"
        }
    },
    {
        name: "web_data_linkedin_company_profile",
        description: "Quickly read structured LinkedIn company profile data. Requires a valid LinkedIn company URL.",
        arguments: {
            url: "string (the LinkedIn company URL)"
        }
    },
    {
        name: "web_data_zoominfo_company_profile",
        description: "Quickly read structured ZoomInfo company profile data. Requires a valid ZoomInfo company URL.",
        arguments: {
            url: "string (the ZoomInfo company URL)"
        }
    },
    {
        name: "web_data_instagram_profiles",
        description: "Quickly read structured Instagram profile data. Requires a valid Instagram profile URL.",
        arguments: {
            url: "string (the Instagram profile URL)"
        }
    },
    {
        name: "web_data_instagram_posts",
        description: "Quickly read structured Instagram post data. Requires a valid Instagram post URL.",
        arguments: {
            url: "string (the Instagram post URL)"
        }
    },
    {
        name: "web_data_instagram_reels",
        description: "Quickly read structured Instagram reel data. Requires a valid Instagram reel URL.",
        arguments: {
            url: "string (the Instagram reel URL)"
        }
    },
    {
        name: "session_stats",
        description: "Provides information about tool usage in the current interaction.",
        arguments: {} // No arguments needed
    },
    {
        name: "web_data_instagram_comments",
        description: "Quickly read structured Instagram comments data for a specific Instagram post or reel. Requires a valid Instagram post/reel URL.",
        arguments: {
            url: "string (the Instagram post or reel URL)"
        }
    },
    {
        name: "web_data_facebook_posts",
        description: "Quickly read structured Facebook post data. Requires a valid Facebook post URL.",
        arguments: {
            url: "string (the Facebook post URL)"
        }
    },
    {
        name: "web_data_facebook_marketplace_listings",
        description: "Quickly read structured Facebook marketplace listing data. Requires a valid Facebook marketplace listing URL.",
        arguments: {
            url: "string (the Facebook marketplace listing URL)"
        }
    },
    {
        name: "web_data_facebook_company_reviews",
        description: "Quickly read structured Facebook company reviews data. Requires a valid Facebook company URL and the number of reviews to fetch.",
        arguments: {
            url: "string (the Facebook company URL)",
            num_of_reviews: "string (the number of reviews to fetch, e.g., '10')"
        }
    },
    {
        name: "web_data_x_posts",
        description: "Quickly read structured X (formerly Twitter) post data. Requires a valid X post URL.",
        arguments: {
            url: "string (the X post URL)"
        }
    },
    {
        name: "web_data_zillow_properties_listing",
        description: "Quickly read structured Zillow properties listing data. Requires a valid Zillow properties listing URL.",
        arguments: {
            url: "string (the Zillow properties listing URL)"
        }
    },
    {
        name: "web_data_booking_hotel_listings",
        description: "Quickly read structured Booking.com hotel listings data. Requires a valid Booking.com hotel listing URL.",
        arguments: {
            url: "string (the Booking.com hotel listing URL)"
        }
    },
    {
        name: "web_data_youtube_videos",
        description: "Quickly read structured YouTube videos data. Requires a valid YouTube video URL.",
        arguments: {
            url: "string (the YouTube video URL)"
        }
    },
    {
        name: "scraping_browser_navigate",
        description: "Navigates a remote browser to a new URL. Use this as the first step for interactive browser tasks.",
        arguments: {
            url: "string (The URL to navigate to)"
        }
    },
    {
        name: "scraping_browser_get_text",
        description: "Gets the visible text content of the current page in a remote browser session. Should be used after navigating to a page.",
        arguments: {} // No arguments needed for get_text itself, assumes prior navigation
    }
];

/**
 * Helper function to get AI response with automatic fallback from Vertex AI to Gemini
 * @param {string} prompt - The prompt to send to the AI
 * @param {Object|null} context - Optional context object (may not be used by Gemini)
 * @param {string} operation - Description of the operation for logging purposes
 * @returns {Promise<{response: string, usedFallback: boolean}>}
 */
async function getAiResponseWithFallback(prompt, context = null, operation = "AI request") {
    let usedFallback = false;
    let originalError = null;
    
    try {
        console.log(`REACT_PROCESSOR: Attempting ${operation} with Vertex AI`);
        const response = await getVertexAiResponse(prompt, context);
        
        // Check if response is valid
        if (!response || response === null || response === undefined) {
            throw new Error("Vertex AI returned null or undefined response");
        }
        
        console.log(`REACT_PROCESSOR: ${operation} successful with Vertex AI`);
        return { response, usedFallback };
    } catch (error) {
        originalError = error;
        console.warn(`REACT_PROCESSOR: Vertex AI failed for ${operation}:`, error.message);
        
        // Check for authentication-related errors, quota issues, or null responses
        // Also check if the error stack contains authentication errors
        const errorString = error.toString() + (error.stack || '');
        const shouldFallback = error.message.includes("UNAUTHENTICATED") || 
                              error.message.includes("invalid_grant") ||
                              error.message.includes("Invalid JWT Signature") ||
                              error.message.includes("PERMISSION_DENIED") ||
                              error.message.includes("GoogleAuthError") ||
                              error.message.includes("quota") ||
                              error.message.includes("rate limit") ||
                              error.message.includes("Vertex AI returned null or undefined response") ||
                              errorString.includes("GoogleAuthError") ||
                              errorString.includes("invalid_grant");
        
        if (shouldFallback) {
            console.warn(`REACT_PROCESSOR: Attempting Gemini fallback for ${operation} due to: ${error.message}`);
            usedFallback = true;
            
            try {
                const response = await getGeminiResponse(prompt);
                
                if (!response || response === null || response === undefined) {
                    throw new Error("Gemini also returned null or undefined response");
                }
                
                console.log(`REACT_PROCESSOR: ${operation} successful with Gemini fallback`);
                return { response, usedFallback };
            } catch (fallbackError) {
                console.error(`REACT_PROCESSOR: Gemini fallback also failed for ${operation}:`, fallbackError.message);
                throw new Error(`Both Vertex AI and Gemini failed for ${operation}. Primary: ${originalError.message}, Fallback: ${fallbackError.message}`);
            }
        } else {
            console.error(`REACT_PROCESSOR: Non-recoverable error from Vertex AI for ${operation}:`, error);
            throw error;
        }
    }
}

/**
 * Helper function to execute tool based on tool name and arguments
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} toolArguments - Arguments for the tool
 * @returns {Promise<string>} Tool execution result
 */
async function executeToolByName(toolName, toolArguments) {
    console.log(`REACT_PROCESSOR: Executing tool: ${toolName} with arguments:`, toolArguments);
    
    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
    const brightDataZone = process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE || 'mcp_unlocker';
    const browserServiceUrl = process.env.BROWSER_AUTOMATION_SERVICE_URL;

    try {
        switch (toolName) {
            case "search_engine":
                if (!toolArguments?.query) {
                    throw new Error("Query argument missing for search_engine tool");
                }
                return await executeSearchEngine(
                    toolArguments.query, 
                    brightDataApiToken, 
                    brightDataZone, 
                    toolArguments.engine
                );

            case "scrape_as_markdown":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for scrape_as_markdown tool");
                }
                return await executeScrapeMarkdown(toolArguments.url, brightDataApiToken, brightDataZone);

            case "scrape_as_html":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for scrape_as_html tool");
                }
                return await executeScrapeHtml(toolArguments.url, brightDataApiToken, brightDataZone);

            case "web_data_linkedin_person_profile":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_linkedin_person_profile tool");
                }
                return await executeGetLinkedInProfile(toolArguments.url, brightDataApiToken);

            case "web_data_amazon_product":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_amazon_product tool");
                }
                return await executeGetAmazonProduct(toolArguments.url, brightDataApiToken);

            case "web_data_amazon_product_reviews":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_amazon_product_reviews tool");
                }
                return await executeGetAmazonProductReviews(toolArguments.url, brightDataApiToken);

            case "web_data_linkedin_company_profile":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_linkedin_company_profile tool");
                }
                return await executeGetLinkedInCompanyProfile(toolArguments.url, brightDataApiToken);

            case "web_data_zoominfo_company_profile":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_zoominfo_company_profile tool");
                }
                return await executeGetZoominfoCompanyProfile(toolArguments.url, brightDataApiToken);

            case "web_data_instagram_profiles":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_instagram_profiles tool");
                }
                return await executeGetInstagramProfile(toolArguments.url, brightDataApiToken);

            case "web_data_instagram_posts":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_instagram_posts tool");
                }
                return await executeGetInstagramPosts(toolArguments.url, brightDataApiToken);

            case "web_data_instagram_reels":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_instagram_reels tool");
                }
                return await executeGetInstagramReels(toolArguments.url, brightDataApiToken);

            case "web_data_instagram_comments":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_instagram_comments tool");
                }
                return await executeGetInstagramComments(toolArguments.url, brightDataApiToken);

            case "web_data_facebook_posts":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_facebook_posts tool");
                }
                return await executeGetFacebookPosts(toolArguments.url, brightDataApiToken);

            case "web_data_facebook_marketplace_listings":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_facebook_marketplace_listings tool");
                }
                return await executeGetFacebookMarketplaceListings(toolArguments.url, brightDataApiToken);

            case "web_data_facebook_company_reviews":
                if (!toolArguments?.url || !toolArguments?.num_of_reviews) {
                    throw new Error("URL or num_of_reviews argument missing for web_data_facebook_company_reviews tool");
                }
                return await executeGetFacebookCompanyReviews(
                    toolArguments.url, 
                    toolArguments.num_of_reviews, 
                    brightDataApiToken
                );

            case "session_stats":
                return executeSessionStats(availableTools);

            case "web_data_x_posts":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_x_posts tool");
                }
                return await executeGetXPosts(toolArguments.url, brightDataApiToken);

            case "web_data_zillow_properties_listing":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_zillow_properties_listing tool");
                }
                return await executeGetZillowPropertiesListing(toolArguments.url, brightDataApiToken);

            case "web_data_booking_hotel_listings":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_booking_hotel_listings tool");
                }
                return await executeGetBookingHotelListings(toolArguments.url, brightDataApiToken);

            case "web_data_youtube_videos":
                if (!toolArguments?.url) {
                    throw new Error("URL argument missing for web_data_youtube_videos tool");
                }
                return await executeGetYoutubeVideos(toolArguments.url, brightDataApiToken);

            case "scraping_browser_navigate":
                if (!browserServiceUrl) {
                    throw new Error("Browser automation service is not configured");
                }
                if (!toolArguments?.url || typeof toolArguments.url !== 'string' || !toolArguments.url.startsWith('http')) {
                    throw new Error("A valid URL is required for browser navigation");
                }
                
                const serviceEndpoint = browserServiceUrl.replace(/\/$/, "") + '/navigate';
                const browserResponse = await fetch(serviceEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: toolArguments.url })
                });
                
                if (browserResponse.ok) {
                    const responseData = await browserResponse.json();
                    return "Browser navigation initiated. Service response: " + JSON.stringify(responseData);
                } else {
                    const errorText = await browserResponse.text();
                    throw new Error(`Browser navigation service error: ${browserResponse.status} ${errorText}`);
                }

            case "scraping_browser_get_text":
                if (!browserServiceUrl) {
                    throw new Error("Browser automation service is not configured");
                }
                
                const getTextEndpoint = browserServiceUrl.replace(/\/$/, "") + '/get_text';
                const getTextResponse = await fetch(getTextEndpoint, { method: 'GET' });
                
                if (getTextResponse.ok) {
                    const responseData = await getTextResponse.json();
                    return "Browser page text content: " + JSON.stringify(responseData);
                } else {
                    const errorText = await getTextResponse.text();
                    throw new Error(`Browser get_text service error: ${getTextResponse.status} ${errorText}`);
                }

            default:
                throw new Error(`Tool '${toolName}' is not configured for execution`);
        }
    } catch (error) {
        console.error(`REACT_PROCESSOR: Error executing tool ${toolName}:`, error.message);
        return `Error executing ${toolName}: ${error.message}`;
    }
}

/**
 * Helper function to update user credits and generate new JWT token
 * @param {Object} context - Context containing db, user, userIdToUpdate, JWT_SECRET, COST_PER_QUERY
 * @returns {Promise<{newCreditBalance: number, newCookie: string|null}>}
 */
async function updateUserCreditsAndToken(context) {
    const { db, user, userIdToUpdate, JWT_SECRET, COST_PER_QUERY } = context;
    const usersCollection = db.collection('users');
    
    try {
        const updatedUser = await usersCollection.findOne({ _id: userIdToUpdate });
        
        const initialCreditsInJWT = typeof user.credits === 'number' ? user.credits : 0;
        const costOfQuery = typeof COST_PER_QUERY === 'number' ? COST_PER_QUERY : 0;
        const newCreditBalance = updatedUser ? updatedUser.credits : (initialCreditsInJWT - costOfQuery);

        console.log('REACT_PROCESSOR: User credits in DB (should reflect deduction):', updatedUser?.credits);
        console.log('REACT_PROCESSOR: New credit balance for X-User-Credits header:', newCreditBalance);

        let newCookie = null;
        if (updatedUser && JWT_SECRET) {
            const tokenPayload = {
                userId: updatedUser._id.toString(),
                username: updatedUser.username,
                email: updatedUser.email,
                roles: updatedUser.roles,
                isEmailVerified: updatedUser.isEmailVerified,
                credits: updatedUser.credits,
            };
            const newToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
            const cookieOptions = {
                httpOnly: true,
                secure: import.meta.env.MODE !== 'development',
                maxAge: 60 * 60,
                path: '/',
                sameSite: 'lax',
            };
            newCookie = serialize('authToken', newToken, cookieOptions);
        } else {
            if (!updatedUser) console.error('REACT_PROCESSOR: Failed to fetch updated user for token regeneration.');
            if (!JWT_SECRET) console.error('REACT_PROCESSOR: JWT_SECRET is missing for token regeneration.');
        }

        return { newCreditBalance, newCookie };
    } catch (error) {
        console.error("REACT_PROCESSOR: Error updating user credits and token:", error);
        const fallbackCredits = typeof user.credits === 'number' ? user.credits - (typeof COST_PER_QUERY === 'number' ? COST_PER_QUERY : 0) : 0;
        return { newCreditBalance: fallbackCredits, newCookie: null };
    }
}

export async function executeInProcessReActLoop(originalUserQuery, ragContext, context) {
    const { db, user, userIdToUpdate, JWT_SECRET, COST_PER_QUERY } = context;
    
    // Build tool descriptions for the AI
    const toolDescriptions = availableTools.map(t => {
        return `${t.name}: ${t.description} Arguments: ${JSON.stringify(t.arguments)}`;
    }).join('\\n');

    // Construct the first pass prompt for tool decision
    let firstPassPrompt = "You are a helpful AI assistant with access to the following tools:\n";
    firstPassPrompt += toolDescriptions;
    
    firstPassPrompt += "\n\nIMPORTANT INSTRUCTIONS FOR TOOL USE:";
    firstPassPrompt += "\n- Review any 'ADDITIONAL CONTEXT FROM KNOWLEDGE BASE' provided below before making a tool decision.";
    firstPassPrompt += "\n- If the 'ADDITIONAL CONTEXT FROM KNOWLEDGE BASE' fully and accurately answers the 'User query', choose 'none' for the tool.";
    firstPassPrompt += "\n- Otherwise, if your general knowledge is sufficient, choose 'none'.";
    firstPassPrompt += "\n- Use tools like 'search_engine' for time-sensitive information (e.g., current prices, news), real-time data, or specifics not in your training or the provided context.";

    if (ragContext) {
        firstPassPrompt += "\n\nADDITIONAL CONTEXT FROM KNOWLEDGE BASE (Consider this before deciding on a tool):\n---\n" + ragContext + "\n---";
    }

    firstPassPrompt += "\n\nUser query: \"" + originalUserQuery + "\"";
    firstPassPrompt += "\n\nConsidering the user query, tools, instructions, and any additional context, do you need to use a tool? Or is the provided context/your general knowledge sufficient?";
    firstPassPrompt += "\nRespond ONLY with a JSON object specifying the \"tool_name\" (e.g., \"search_engine\", or \"none\" if no tool is needed) and, if a tool is chosen, an \"arguments\" object for that tool. Example for tool use: {\"tool_name\": \"search_engine\", \"arguments\": {\"query\": \"latest Bitcoin news\"}}. Example for no tool: {\"tool_name\": \"none\"}.";
    
    console.log("REACT_PROCESSOR: First pass prompt for tool decision:", firstPassPrompt);
    
    // Get tool decision with fallback
    let toolDecision;
    let usedFallbackForDecision = false;
    
    try {
        const { response: geminiRawResponse, usedFallback } = await getAiResponseWithFallback(
            firstPassPrompt, 
            context, 
            "tool decision"
        );
        usedFallbackForDecision = usedFallback;
        
        // Add null check before processing
        if (!geminiRawResponse) {
            throw new Error("Received null or empty response from AI service");
        }
        
        // Parse the tool decision
        let cleanedResponse = geminiRawResponse;
        if (cleanedResponse.startsWith("```json")) cleanedResponse = cleanedResponse.substring(7);
        if (cleanedResponse.endsWith("```")) cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
        
        toolDecision = JSON.parse(cleanedResponse.trim());
        console.log("REACT_PROCESSOR: AI tool decision (after cleaning):", toolDecision, 
            usedFallbackForDecision ? "(via Gemini fallback)" : "(via Vertex AI)");
        
    } catch (error) {
        console.error("REACT_PROCESSOR: Failed to get or parse tool decision:", error);
        
        // Update credits and return error response
        const { newCreditBalance, newCookie } = await updateUserCreditsAndToken(context);
        const errorHeaders = {
            'Content-Type': 'application/json',
            'X-User-Credits': newCreditBalance.toString()
        };
        if (newCookie) errorHeaders['Set-Cookie'] = newCookie;

        return {
            status: 500,
            body: { 
                error: "llm_tool_decision_failed", 
                reply: "Sorry, I encountered an error while deciding on an action." 
            },
            headers: errorHeaders,
        };
    }

    // Execute the main ReAct logic
    try {
        let toolOutput = null;
        let effectiveToolName = toolDecision?.tool_name;

        // Execute tool if one was selected
        if (effectiveToolName && effectiveToolName !== "none") {
            console.log(`REACT_PROCESSOR: Executing tool: ${effectiveToolName}`);
            toolOutput = await executeToolByName(effectiveToolName, toolDecision.arguments);
        }

        // Generate final response
        let finalSynthesisPrompt;
        let finalAiResponse;
        let usedFallbackForSynthesis = false;

        if (effectiveToolName === "none") {
            // No tool was used, generate response based on context or general knowledge
            if (ragContext) {
                finalSynthesisPrompt = `SYSTEM INSTRUCTION: You are in STRICT CONTEXT-ONLY MODE. Your primary goal is to answer the user's query using ONLY the "Context from Knowledge Base" provided. Do not use any external knowledge or your general training data. If the context does not contain the answer, explicitly state that the information is not available in the provided context.
ROLE: You are hermitAI, an assistant that answers strictly from the provided text.
Context from Knowledge Base:
---
${ragContext}
---
Original Query:
${originalUserQuery}
Your answer (ONLY from the context provided):`;
                console.log("REACT_PROCESSOR_NO_TOOL: Using RAG context for synthesis (tool_name was 'none').");
            } else {
                finalSynthesisPrompt = `SYSTEM INSTRUCTION: You are hermitAI. Please provide a helpful and concise answer to the following user query based on your general knowledge.
User Query:
"${originalUserQuery}"

Based on this, provide a direct answer.`;
                console.log("REACT_PROCESSOR_NO_TOOL: Using original query for general synthesis (no RAG, no tool).");
            }
        } else if (toolOutput && effectiveToolName !== "none") {
            // A tool was executed, synthesize response based on tool output
            finalSynthesisPrompt = `User query: "${originalUserQuery}"\nI used the '${effectiveToolName}' tool and received the following information:\n${JSON.stringify(toolOutput)}\nBased on this information, please provide a concise answer to the user's query. If the information is an error message, explain the error. If the information is complex, summarize it. Respond directly to the user.`;
            console.log("REACT_PROCESSOR: Synthesizing response based on tool output.");
        }

        // Get final AI response with fallback
        try {
            const { response, usedFallback } = await getAiResponseWithFallback(
                finalSynthesisPrompt, 
                context, 
                "final synthesis"
            );
            finalAiResponse = response;
            usedFallbackForSynthesis = usedFallback;
            
            console.log("REACT_PROCESSOR: Final synthesis completed", 
                       usedFallbackForSynthesis ? "(via Gemini fallback)" : "(via Vertex AI)");
        } catch (error) {
            console.error("REACT_PROCESSOR: Final synthesis failed:", error);
            
            // Update credits and return error response
            const { newCreditBalance, newCookie } = await updateUserCreditsAndToken(context);
            const errorHeaders = {
                'Content-Type': 'application/json',
                'X-User-Credits': newCreditBalance.toString()
            };
            if (newCookie) errorHeaders['Set-Cookie'] = newCookie;

            return {
                status: 500,
                body: { 
                    error: "ai_synthesis_failed", 
                    reply: "Sorry, I couldn't generate a response due to AI service issues." 
                },
                headers: errorHeaders,
            };
        }
        
        // Update user credits and generate new token
        const { newCreditBalance, newCookie } = await updateUserCreditsAndToken(context);

        // Prepare response headers
        const responseHeaders = {
            'Content-Type': 'application/json',
            'X-User-Credits': newCreditBalance.toString()
        };
        if (newCookie) {
            responseHeaders['Set-Cookie'] = newCookie;
        }

        // Log fallback usage summary
        if (usedFallbackForDecision || usedFallbackForSynthesis) {
            console.log("REACT_PROCESSOR: Fallback usage summary - Decision:", 
                       usedFallbackForDecision ? "Gemini" : "Vertex AI", 
                       "Synthesis:", usedFallbackForSynthesis ? "Gemini" : "Vertex AI");
        }

        return {
            status: 200,
            body: { reply: finalAiResponse || "A response was processed, but no final text was generated." },
            headers: responseHeaders,
        };

    } catch (error) {
        console.error("REACT_PROCESSOR: Error during ReAct loop (tool execution or processing):", error);
        
        // Update credits and return error response
        const { newCreditBalance, newCookie } = await updateUserCreditsAndToken(context);
        const errorHeaders = {
            'Content-Type': 'application/json',
            'X-User-Credits': newCreditBalance.toString()
        };
        if (newCookie) errorHeaders['Set-Cookie'] = newCookie;

        return {
            status: 500,
            body: { 
                error: "react_loop_exception", 
                reply: "Sorry, an unexpected error occurred during the ReAct process." 
            },
            headers: errorHeaders,
        };
    }
}