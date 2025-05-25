import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { getVertexAiResponse } from './vertexAiService.js'; // Assuming it's in the same services directory

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
// Note: connectToDatabase and ObjectId are not directly used here as db instance and userIdToUpdate (as ObjectId) are passed in context.

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

export async function executeInProcessReActLoop(originalUserQuery, ragContext, context) {
    const { db, user, userIdToUpdate, JWT_SECRET, COST_PER_QUERY } = context;
    const usersCollection = db.collection('users');
    let toolDecision;

    // forceToolName parameter is removed, so this block is no longer needed in the same way.
    // If there's a scenario to force 'none', it would be handled by the RAG logic in chat.js
    // or potentially by a more sophisticated pre-decision logic here if needed in the future.

    const toolDescriptions = availableTools.map(t => {
        return `${t.name}: ${t.description} Arguments: ${JSON.stringify(t.arguments)}`;
    }).join('\\n');

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
    
    const geminiRawResponse = await getVertexAiResponse(firstPassPrompt, context);

    if (geminiRawResponse === null) {
        console.error("REACT_PROCESSOR: Failed to get response from LLM for tool decision.");
            return {
                status: 500,
                body: { error: "llm_tool_decision_failed", reply: "Sorry, I encountered an error trying to decide on an action." },
                headers: { 'Content-Type': 'application/json' },
            };
        }

        try {
            let cleanedResponse = geminiRawResponse;
            if (cleanedResponse.startsWith("```json")) cleanedResponse = cleanedResponse.substring(7);
            if (cleanedResponse.endsWith("```")) cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
            toolDecision = JSON.parse(cleanedResponse.trim());
            console.log("REACT_PROCESSOR: Gemini tool decision (after cleaning):", toolDecision);
        } catch (parseError) {
            console.error("REACT_PROCESSOR: Failed to parse LLM response for tool decision:", parseError, "Raw response:", geminiRawResponse);
            return {
                status: 500,
                body: { error: "llm_tool_decision_parse_failed", reply: "Sorry, I received an unparsable response from the AI while deciding on an action." },
                headers: { 'Content-Type': 'application/json' },
            };
        }
    // The extra closing brace that was here has been removed.

    // This outer try-catch handles errors in the main ReAct logic (tool execution, final synthesis)
    try {
        let toolOutput = null;
        let effectiveToolName = null; // To store the name of the tool that was decided

        if (toolDecision && toolDecision.tool_name && toolDecision.tool_name !== "none") {
            effectiveToolName = toolDecision.tool_name;
            console.log(`REACT_PROCESSOR: Attempting to execute tool: ${effectiveToolName}`);

            // Tool execution logic based on effectiveToolName
            if (effectiveToolName === "search_engine") {
                if (toolDecision.arguments && toolDecision.arguments.query) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    const brightDataZone = process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE;
                    toolOutput = await executeSearchEngine(toolDecision.arguments.query, brightDataApiToken, brightDataZone, toolDecision.arguments.engine);
                } else {
                    console.error(`Missing query argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: Query argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "scrape_as_markdown") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    const brightDataZone = process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE || 'mcp_unlocker';
                    toolOutput = await executeScrapeMarkdown(toolDecision.arguments.url, brightDataApiToken, brightDataZone);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "scrape_as_html") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    const brightDataZone = process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE;
                    toolOutput = await executeScrapeHtml(toolDecision.arguments.url, brightDataApiToken, brightDataZone);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_linkedin_person_profile") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetLinkedInProfile(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_amazon_product") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetAmazonProduct(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_amazon_product_reviews") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetAmazonProductReviews(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_linkedin_company_profile") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetLinkedInCompanyProfile(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_zoominfo_company_profile") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetZoominfoCompanyProfile(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_instagram_profiles") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetInstagramProfile(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_instagram_posts") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetInstagramPosts(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_instagram_reels") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetInstagramReels(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_instagram_comments") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetInstagramComments(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_facebook_posts") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetFacebookPosts(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_facebook_marketplace_listings") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetFacebookMarketplaceListings(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_facebook_company_reviews") {
                if (toolDecision.arguments && toolDecision.arguments.url && toolDecision.arguments.num_of_reviews) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetFacebookCompanyReviews(toolDecision.arguments.url, toolDecision.arguments.num_of_reviews, brightDataApiToken);
                } else {
                    console.error(`Missing URL or num_of_reviews argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL or num_of_reviews argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "session_stats") {
                toolOutput = executeSessionStats(availableTools);
            } else if (effectiveToolName === "web_data_x_posts") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetXPosts(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_zillow_properties_listing") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetZillowPropertiesListing(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_booking_hotel_listings") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetBookingHotelListings(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "web_data_youtube_videos") {
                if (toolDecision.arguments && toolDecision.arguments.url) {
                    const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
                    toolOutput = await executeGetYoutubeVideos(toolDecision.arguments.url, brightDataApiToken);
                } else {
                    console.error(`Missing URL argument for ${effectiveToolName} tool.`);
                    toolOutput = `Error: URL argument missing for ${effectiveToolName} tool.`;
                }
            } else if (effectiveToolName === "scraping_browser_navigate") {
                const targetUrl = toolDecision.arguments?.url;
                toolOutput = "Attempting to navigate browser to: " + (targetUrl || "No URL provided") + "\\n";
                const BROWSER_AUTOMATION_SERVICE_URL = process.env.BROWSER_AUTOMATION_SERVICE_URL;
                if (!BROWSER_AUTOMATION_SERVICE_URL) {
                    console.error("BROWSER_AUTOMATION_SERVICE_URL is not configured.");
                    toolOutput += "Error: Browser automation service is not configured.";
                } else if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.startsWith('http')) {
                    console.error("Invalid or missing URL for browser navigation:", targetUrl);
                    toolOutput += "Error: A valid URL is required for browser navigation.";
                } else {
                    try {
                        const serviceEndpoint = BROWSER_AUTOMATION_SERVICE_URL.replace(/\/$/, "") + '/navigate';
                        const browserResponse = await fetch(serviceEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: targetUrl }) });
                        if (browserResponse.ok) {
                            const responseData = await browserResponse.json();
                            toolOutput = "Browser navigation initiated. Service response: " + JSON.stringify(responseData);
                        } else {
                            const errorText = await browserResponse.text();
                            toolOutput += `Error from browser navigation service: ${browserResponse.status} ${errorText}`;
                        }
                    } catch (serviceError) {
                        toolOutput += `Exception during browser navigation: ${serviceError.message}`;
                    }
                }
            } else if (effectiveToolName === "scraping_browser_get_text") {
                toolOutput = "Attempting to get text from current browser page.\\n";
                const BROWSER_AUTOMATION_SERVICE_URL = process.env.BROWSER_AUTOMATION_SERVICE_URL;
                if (!BROWSER_AUTOMATION_SERVICE_URL) {
                    console.error("BROWSER_AUTOMATION_SERVICE_URL is not configured.");
                    toolOutput += "Error: Browser automation service is not configured.";
                } else {
                    try {
                        const serviceEndpoint = BROWSER_AUTOMATION_SERVICE_URL.replace(/\/$/, "") + '/get_text';
                        const browserResponse = await fetch(serviceEndpoint, { method: 'GET' });
                        if (browserResponse.ok) {
                            const responseData = await browserResponse.json();
                            toolOutput = "Browser page text content: " + JSON.stringify(responseData);
                        } else {
                            const errorText = await browserResponse.text();
                            toolOutput += `Error from browser get_text service: ${browserResponse.status} ${errorText}`;
                        }
                    } catch (serviceError) {
                        toolOutput += `Exception during browser get_text: ${serviceError.message}`;
                    }
                }
            } else {
                console.warn("REACT_PROCESSOR: Tool recognized by AI but no specific execution logic or arguments missing:", toolDecision);
                toolOutput = `Error: AI selected tool '${effectiveToolName}' but it's not configured for execution or arguments are invalid.`;
            }
        }

        let finalSynthesisPrompt;
        let finalAiResponse;

        if (toolDecision && toolDecision.tool_name === "none") {
            if (ragContext) { // LLM decided 'none' tool, and RAG context was available
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
            } else { // No RAG context was passed, and tool_name is 'none'
                finalSynthesisPrompt = `SYSTEM INSTRUCTION: You are hermitAI. Please provide a helpful and concise answer to the following user query based on your general knowledge.
User Query:
"${originalUserQuery}"

Based on this, provide a direct answer.`;
                console.log("REACT_PROCESSOR_NO_TOOL: Using original query for general synthesis (no RAG, no tool).");
            }
            finalAiResponse = await getVertexAiResponse(finalSynthesisPrompt, context);
        } else if (toolOutput && effectiveToolName && effectiveToolName !== "none") {
            // A tool was chosen and executed successfully
            finalSynthesisPrompt = `User query: "${originalUserQuery}"\nI used the '${effectiveToolName}' tool and received the following information:\n${JSON.stringify(toolOutput)}\nBased on this information, please provide a concise answer to the user's query. If the information is an error message, explain the error. If the information is complex, summarize it. Respond directly to the user.`;
            console.log("REACT_PROCESSOR: Synthesizing response based on tool output.");
            finalAiResponse = await getVertexAiResponse(finalSynthesisPrompt, context);
        } else {
            // Tool was chosen but failed, or some other unexpected state. Fallback to a general response.
            console.warn(`REACT_PROCESSOR: Tool '${effectiveToolName || toolDecision?.tool_name}' might have been chosen but failed or produced no output. Falling back to general response for original query.`);
            finalSynthesisPrompt = `SYSTEM INSTRUCTION: You are hermitAI. An attempt to use a tool to answer the query "${originalUserQuery}" did not yield a specific result. Please provide a general answer to the query based on your knowledge, or state if you cannot answer.`;
            finalAiResponse = await getVertexAiResponse(finalSynthesisPrompt, context);
        }
        
        const updatedUser = await usersCollection.findOne({ _id: userIdToUpdate });
        
        const initialCreditsInJWT = typeof user.credits === 'number' ? user.credits : 0;
        const costOfQuery = typeof COST_PER_QUERY === 'number' ? COST_PER_QUERY : 0;
        const newCreditBalanceForHeader = updatedUser ? updatedUser.credits : (initialCreditsInJWT - costOfQuery);

        console.log('AI_CHAT_DEBUG: User credits in DB (should reflect deduction):', updatedUser?.credits);
        console.log('AI_CHAT_DEBUG: New credit balance for X-User-Credits header:', newCreditBalanceForHeader);

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
            if (!updatedUser) console.error('AI_CHAT_DEBUG: Failed to fetch updated user for token regeneration.');
            if (!JWT_SECRET) console.error('AI_CHAT_DEBUG: JWT_SECRET is missing for token regeneration.');
        }

        const responseHeaders = {
            'Content-Type': 'application/json',
            'X-User-Credits': newCreditBalanceForHeader.toString()
        };
        if (newCookie) {
            responseHeaders['Set-Cookie'] = newCookie;
        }

        return {
            status: 200,
            body: { reply: finalAiResponse || "A response was processed, but no final text was generated." },
            headers: responseHeaders,
        };

    } catch (error) {
        console.error("REACT_PROCESSOR: Error during ReAct loop (tool execution or final synthesis):", error);
        const initialCreditsInJWTOnError = typeof user.credits === 'number' ? user.credits : 0;
        const costOfQueryOnError = typeof COST_PER_QUERY === 'number' ? COST_PER_QUERY : 0;
        let creditsForHeaderOnError = initialCreditsInJWTOnError - costOfQueryOnError;

        try {
            const userOnError = await usersCollection.findOne({ _id: userIdToUpdate });
            if (userOnError) {
                creditsForHeaderOnError = userOnError.credits;
            }
        } catch (dbError) {
            console.error("REACT_PROCESSOR: Could not fetch user credits during error handling:", dbError);
        }
        
        const errorResponseHeaders = {
            'Content-Type': 'application/json',
            'X-User-Credits': creditsForHeaderOnError.toString()
        };

        return {
            status: 500,
            body: { error: "react_loop_exception", reply: "Sorry, an unexpected error occurred during the ReAct process." },
            headers: errorResponseHeaders,
        };
    }
}