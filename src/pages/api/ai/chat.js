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
import { executeGetInstagramComments } from '../../../lib/ai-tools/instagramCommentsTool.js';
import { executeGetFacebookPosts } from '../../../lib/ai-tools/facebookPostsTool.js';
import { executeGetFacebookMarketplaceListings } from '../../../lib/ai-tools/facebookMarketplaceListingsTool.js';
import { executeGetFacebookCompanyReviews } from '../../../lib/ai-tools/facebookCompanyReviewsTool.js';
import { executeGetXPosts } from '../../../lib/ai-tools/xPostsTool.js';
import { executeGetZillowPropertiesListing } from '../../../lib/ai-tools/zillowPropertiesListingTool.js';
import { executeGetBookingHotelListings } from '../../../lib/ai-tools/bookingHotelListingsTool.js';
import { executeGetYoutubeVideos } from '../../../lib/ai-tools/youtubeVideosTool.js';

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
          } else if (toolDecision.tool_name === "web_data_instagram_comments") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetInstagramComments(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_instagram_comments tool.");
              toolOutput = "Error: URL argument missing for web_data_instagram_comments tool.";
            }
          } else if (toolDecision.tool_name === "web_data_facebook_posts") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetFacebookPosts(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_facebook_posts tool.");
              toolOutput = "Error: URL argument missing for web_data_facebook_posts tool.";
            }
          } else if (toolDecision.tool_name === "web_data_facebook_marketplace_listings") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetFacebookMarketplaceListings(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_facebook_marketplace_listings tool.");
              toolOutput = "Error: URL argument missing for web_data_facebook_marketplace_listings tool.";
            }
          } else if (toolDecision.tool_name === "web_data_facebook_company_reviews") {
            if (toolDecision.arguments && toolDecision.arguments.url && toolDecision.arguments.num_of_reviews) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetFacebookCompanyReviews(toolDecision.arguments.url, toolDecision.arguments.num_of_reviews, brightDataApiToken);
            } else {
              console.error("Missing URL or num_of_reviews argument for web_data_facebook_company_reviews tool.");
              toolOutput = "Error: URL or num_of_reviews argument missing for web_data_facebook_company_reviews tool.";
            }
          } else if (toolDecision.tool_name === "session_stats") {
            toolOutput = executeSessionStats(availableTools);
          } else if (toolDecision.tool_name === "web_data_x_posts") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetXPosts(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_x_posts tool.");
              toolOutput = "Error: URL argument missing for web_data_x_posts tool.";
            }
          } else if (toolDecision.tool_name === "web_data_zillow_properties_listing") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetZillowPropertiesListing(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_zillow_properties_listing tool.");
              toolOutput = "Error: URL argument missing for web_data_zillow_properties_listing tool.";
            }
          } else if (toolDecision.tool_name === "web_data_booking_hotel_listings") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetBookingHotelListings(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_booking_hotel_listings tool.");
              toolOutput = "Error: URL argument missing for web_data_booking_hotel_listings tool.";
            }
          } else if (toolDecision.tool_name === "web_data_youtube_videos") {
            if (toolDecision.arguments && toolDecision.arguments.url) {
              const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
              toolOutput = await executeGetYoutubeVideos(toolDecision.arguments.url, brightDataApiToken);
            } else {
              console.error("Missing URL argument for web_data_youtube_videos tool.");
              toolOutput = "Error: URL argument missing for web_data_youtube_videos tool.";
            }
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
