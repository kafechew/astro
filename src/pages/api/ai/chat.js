// src/pages/api/ai/chat.js
import dotenv from 'dotenv';
dotenv.config(); // Load .env for this API route specifically

import { getVertexAiResponse } from '../../../services/vertexAiService.js';
import { exec } from 'child_process';
import util from 'util';
import { executeSearchEngine } from '../../../lib/ai-tools/searchEngineTool.js';
import { executeScrapeMarkdown } from '../../../lib/ai-tools/scrapeMarkdownTool.js';
import { executeScrapeHtml } from '../../../lib/ai-tools/scrapeHtmlTool.js';
import { executeGetLinkedInProfile } from '../../../lib/ai-tools/linkedinProfileTool.js';
import { executeGetAmazonProduct } from '../../../lib/ai-tools/amazonProductTool.js';
import { executeGetAmazonProductReviews } from '../../../lib/ai-tools/amazonProductReviewsTool.js';
import { executeSessionStats } from '../../../lib/ai-tools/sessionStatsTool.js';
import { executeGetLinkedInCompanyProfile } from '../../../lib/ai-tools/linkedinCompanyProfileTool.js';
import { executeGetZoominfoCompanyProfile } from '../../../lib/ai-tools/zoominfoCompanyProfileTool.js';
import { executeGetInstagramProfile } from '../../../lib/ai-tools/instagramProfileTool.js';
import { executeGetInstagramPosts } from '../../../lib/ai-tools/instagramPostsTool.js';
import { executeGetInstagramReels } from '../../../lib/ai-tools/instagramReelsTool.js';

export async function POST(context) {
  try {
    const { message: userMessage } = await context.request.json();

    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
      return new Response(JSON.stringify({ error: 'Message cannot be empty.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const availableTools = [
      {
        name: "search_engine",
        description: "Performs a web search using Google (via BrightData SERP API) to find relevant information or URLs. Returns structured search results.",
        arguments: {
          query: "string (the search query)"
        }
      },
      {
        name: "scrape_as_markdown",
        description: "Fetches the content of a given URL as Markdown text using BrightData Crawl API. Use this if you have a specific URL and need its textual content.",
        arguments: {
          url: "string (the URL to scrape)"
        }
      },
      {
        name: "scrape_as_html",
        description: "Scrape a single webpage URL with advanced options for content extraction and get back the results in HTML. This tool can unlock any webpage even if it uses bot detection or CAPTCHA.",
        arguments: {
          url: "string (the URL to scrape)"
        }
      },
      {
        name: "web_data_linkedin_person_profile",
        description: "Quickly read structured LinkedIn people profile data using a specific LinkedIn profile URL. This can be a cache lookup, so it can be more reliable than scraping directly.",
        arguments: {
          url: "string (the full LinkedIn profile URL)"
        }
      },
      {
        name: "web_data_amazon_product",
        description: "Quickly read structured Amazon product data. Requires a valid Amazon product URL with /dp/ in it. This can be a cache lookup, so it can be more reliable than scraping directly.",
        arguments: {
          url: "string (the full Amazon product URL containing /dp/)"
        }
      },
      {
        name: "web_data_amazon_product_reviews",
        description: "Quickly read structured Amazon product review data. Requires a valid Amazon product URL with /dp/ in it. This can be a cache lookup, so it can be more reliable than scraping directly.",
        arguments: {
          url: "string (the full Amazon product URL containing /dp/)"
        }
      },
      {
        name: "web_data_linkedin_company_profile",
        description: "Quickly read structured LinkedIn company profile data using a specific LinkedIn company URL.",
        arguments: {
          url: "string (the full LinkedIn company profile URL)"
        }
      },
      {
        name: "web_data_zoominfo_company_profile",
        description: "Quickly read structured ZoomInfo company profile data. Requires a valid ZoomInfo company URL.",
        arguments: {
          url: "string (the full ZoomInfo company profile URL)"
        }
      },
      {
        name: "web_data_instagram_profiles",
        description: "Quickly read structured Instagram profile data. Requires a valid Instagram URL.",
        arguments: {
          url: "string (the full Instagram profile URL)"
        }
      },
      {
        name: "web_data_instagram_posts",
        description: "Quickly read structured Instagram post data. Requires a valid Instagram URL (can be a profile URL to get posts from, or a specific post URL).",
        arguments: {
          url: "string (the Instagram profile or post URL)"
        }
      },
      {
        name: "web_data_instagram_reels",
        description: "Quickly read structured Instagram reel data. Requires a valid Instagram URL (can be a profile URL to get reels from, or a specific reel URL).",
        arguments: {
          url: "string (the Instagram profile or reel URL)"
        }
      },
      {
        name: "session_stats",
        description: "Provides information about tool usage in the current interaction.",
        arguments: {} // No arguments needed
      }
    ];
    
    const toolDescriptions = availableTools.map(t => {
      return t.name + ": " + t.description + " Arguments: " + JSON.stringify(t.arguments);
    }).join('\\n');

    let firstPassPrompt = "You are a helpful AI assistant with access to the following tools:\\n";
    firstPassPrompt += toolDescriptions;
    firstPassPrompt += "\\n\\nUser query: \"" + userMessage + "\"";
    firstPassPrompt += "\\n\\nBased on the user query and the available tools, do you need to use a tool?";
    firstPassPrompt += "\\nIf yes, respond ONLY with a JSON object specifying the \"tool_name\" and an \"arguments\" object for that tool. Example: {\"tool_name\": \"search_engine\", \"arguments\": {\"query\": \"some search query\"}}";
    firstPassPrompt += "\\nIf no tool is needed, respond ONLY with the JSON object: {\"tool_name\": \"none\"}.";

    const geminiRawResponse = await getVertexAiResponse(firstPassPrompt);

    if (geminiRawResponse !== null) {
      try {
        let cleanedResponse = geminiRawResponse;
        if (cleanedResponse.startsWith("```json")) {
          cleanedResponse = cleanedResponse.substring(7); 
        }
        if (cleanedResponse.endsWith("```")) {
          cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
        }
        cleanedResponse = cleanedResponse.trim(); 

        const toolDecision = JSON.parse(cleanedResponse);
        console.log("Gemini tool decision (after cleaning):", toolDecision);

        let toolOutput = null; 

        if (toolDecision && toolDecision.tool_name && toolDecision.tool_name !== "none") {
          const effectiveToolName = toolDecision.tool_name;

          if (toolDecision.tool_name === "search_engine") {
            if (toolDecision.arguments && toolDecision.arguments.query) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              const brightDataZone = process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE;
              toolOutput = await executeSearchEngine(toolDecision.arguments.query, brightDataApiToken, brightDataZone);
            } else {
              console.error("Missing query argument for search_engine tool.");
              toolOutput = "Error: Query argument missing for search_engine tool.";
            }
          } else if (toolDecision.tool_name === "scrape_as_markdown") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              const brightDataZone = process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE || 'mcp_unlocker'; // Default zone if needed
              toolOutput = await executeScrapeMarkdown(toolDecision.arguments.url, brightDataApiToken, brightDataZone);
            } else {
              console.error("Missing URL argument for scrape_as_markdown tool.");
              toolOutput = "Error: URL argument missing for scrape_as_markdown tool.";
            }
          } else if (toolDecision.tool_name === "scrape_as_html") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              const brightDataZone = process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE;
              toolOutput = await executeScrapeHtml(toolDecision.arguments.url, brightDataApiToken, brightDataZone);
            } else {
              console.error("Missing URL argument for scrape_as_html tool.");
              toolOutput = "Error: URL argument missing for scrape_as_html tool.";
            }
          } else if (toolDecision.tool_name === "web_data_linkedin_person_profile") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetLinkedInProfile(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_linkedin_person_profile tool.");
              toolOutput = "Error: URL argument missing for web_data_linkedin_person_profile tool.";
            }
        } else if (toolDecision.tool_name === "web_data_amazon_product") {
          if (toolDecision.arguments && toolDecision.arguments.url) {
            const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
            toolOutput = await executeGetAmazonProduct(toolDecision.arguments.url, brightDataApiToken);
          } else {
            console.error("Missing URL argument for web_data_amazon_product tool.");
            toolOutput = "Error: URL argument missing for web_data_amazon_product tool.";
          }
          } else if (toolDecision.tool_name === "web_data_amazon_product_reviews") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetAmazonProductReviews(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_amazon_product_reviews tool.");
              toolOutput = "Error: URL argument missing for web_data_amazon_product_reviews tool.";
            }
          } else if (toolDecision.tool_name === "web_data_linkedin_company_profile") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetLinkedInCompanyProfile(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_linkedin_company_profile tool.");
              toolOutput = "Error: URL argument missing for web_data_linkedin_company_profile tool.";
            }
          } else if (toolDecision.tool_name === "web_data_zoominfo_company_profile") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetZoominfoCompanyProfile(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_zoominfo_company_profile tool.");
              toolOutput = "Error: URL argument missing for web_data_zoominfo_company_profile tool.";
            }
          } else if (toolDecision.tool_name === "web_data_instagram_profiles") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetInstagramProfile(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_instagram_profiles tool.");
              toolOutput = "Error: URL argument missing for web_data_instagram_profiles tool.";
            }
          } else if (toolDecision.tool_name === "web_data_instagram_posts") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetInstagramPosts(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_instagram_posts tool.");
              toolOutput = "Error: URL argument missing for web_data_instagram_posts tool.";
            }
          } else if (toolDecision.tool_name === "web_data_instagram_reels") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetInstagramReels(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_instagram_reels tool.");
              toolOutput = "Error: URL argument missing for web_data_instagram_reels tool.";
            }
          } else if (toolDecision.tool_name === "session_stats") {
            toolOutput = executeSessionStats(availableTools);
          } else {
            console.warn("Tool recognized by AI but no specific command construction logic or arguments missing:", toolDecision);
            toolOutput = "Error: AI selected tool '" + toolDecision.tool_name + "' but it's not configured for execution or arguments are invalid.";
          }

          let finalPrompt;
          if (toolOutput) { 
            finalPrompt = "User query: \"" + userMessage + "\"" +
                          "\\nI used the '" + effectiveToolName + "' tool and received the following information:" +
                          "\\n---" +
                          "\\n" + toolOutput +
                          "\\n---" +
                          "\\nBased on this information and the original query, please provide a comprehensive answer. If the information indicates an error, state that you couldn't retrieve the specific details but try to answer generally if possible.";
          } else { 
            finalPrompt = "User query: \"" + userMessage + "\"" +
                          "\\nPlease answer this query directly. I attempted to use the '" + effectiveToolName + "' tool, but no output was generated.";
          }

          const finalAiResponse = await getVertexAiResponse(finalPrompt);

          if (finalAiResponse !== null) {
            return new Response(JSON.stringify({ reply: finalAiResponse }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          } else {
            console.error("Failed to get final synthesized response from AI.");
            return new Response(JSON.stringify({ error: 'Failed to get final synthesized response from AI.', reply: "I encountered an issue synthesizing the final answer." }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            });
          }

        } else if (toolDecision && toolDecision.tool_name === "none") {
          const finalPrompt = "User query: \"" + userMessage + "\"" +
                              "\\nPlease answer this query directly.";
          const finalAiResponse = await getVertexAiResponse(finalPrompt);

          if (finalAiResponse !== null) {
            return new Response(JSON.stringify({ reply: finalAiResponse }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          } else {
            console.error("Failed to get response from AI for direct answer (tool_name: none).");
            return new Response(JSON.stringify({ error: 'Failed to get response from AI for direct answer.', reply: "I encountered an issue processing your request." }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        } else {
          console.error("Unexpected tool_decision format from AI:", toolDecision);
          return new Response(JSON.stringify({ error: "Unexpected format for AI tool decision.", reply: "I received an unexpected decision format from my reasoning module." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (parseError) {
        console.error("Failed to parse Gemini's tool decision:", parseError);
        console.error("Gemini's raw response:", geminiRawResponse);
        return new Response(JSON.stringify({ error: "Failed to parse AI's tool decision.", details: geminiRawResponse }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Failed to get response from AI service for tool decision.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in /api/ai/chat.js:', error);
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
