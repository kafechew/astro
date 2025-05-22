// src/pages/api/ai/chat.js
import dotenv from 'dotenv';
dotenv.config(); // Load .env for this API route specifically

import { getVertexAiResponse } from '../../../services/vertexAiService.js';
import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

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
      // Add more tools later
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
      }
    ];
    const toolDescriptions = availableTools.map(t => `${t.name}: ${t.description} Arguments: ${JSON.stringify(t.arguments)}`).join('\n');

    const firstPassPrompt = `You are a helpful AI assistant with access to the following tools:
    ${toolDescriptions}

    User query: "${userMessage}"

    Based on the user query and the available tools, do you need to use a tool?
    If yes, respond ONLY with a JSON object specifying the "tool_name" and an "arguments" object for that tool. Example: {"tool_name": "search_engine", "arguments": {"query": "some search query"}}
    If no tool is needed, respond ONLY with the JSON object: {"tool_name": "none"}.`;

    const geminiRawResponse = await getVertexAiResponse(firstPassPrompt);

    if (geminiRawResponse !== null) {
      try {
        let cleanedResponse = geminiRawResponse;
        if (cleanedResponse.startsWith("```json")) {
          cleanedResponse = cleanedResponse.substring(7); // Remove ```json\n
        }
        if (cleanedResponse.endsWith("```")) {
          cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3); // Remove ```
        }
        cleanedResponse = cleanedResponse.trim(); // Trim any leading/trailing whitespace

        const toolDecision = JSON.parse(cleanedResponse);
        console.log("Gemini tool decision (after cleaning):", toolDecision);

        let toolOutput = null; // Initialize toolOutput for storing results or errors

        if (toolDecision && toolDecision.tool_name && toolDecision.tool_name !== "none") {
          const effectiveToolName = toolDecision.tool_name;

          // Tool execution logic starts here
          if (toolDecision.tool_name === "search_engine" && toolDecision.arguments && toolDecision.arguments.query) {
            const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
            const brightDataZone = process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE; // Or your specific SERP API zone

            if (!brightDataApiToken || !brightDataZone) {
              console.error("BrightData API token or Zone not configured in environment variables.");
              toolOutput = "Error: BrightData SERP API credentials not configured.";
            } else {
              try {
                const targetUrl = `https://www.google.com/search?q=${encodeURIComponent(toolDecision.arguments.query)}&brd_json=1`;
                console.log(`Calling BrightData SERP API for query: ${toolDecision.arguments.query} via URL: ${targetUrl}`);
                const serpResponse = await fetch('https://api.brightdata.com/request', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${brightDataApiToken}`
                  },
                  body: JSON.stringify({
                    zone: brightDataZone,
                    url: targetUrl,
                    format: 'raw' // Or 'json' if the API directly supports it
                  })
                });

                if (serpResponse.ok) {
                  const serpData = await serpResponse.json();
                  toolOutput = JSON.stringify(serpData, null, 2);
                  console.log("BrightData SERP API Output:", toolOutput);
                } else {
                  const errorText = await serpResponse.text();
                  console.error("BrightData SERP API Error:", serpResponse.status, errorText);
                  toolOutput = `Error fetching search results: ${serpResponse.status} ${errorText}`;
                }
              } catch (apiError) {
                console.error("Error calling BrightData SERP API:", apiError);
                toolOutput = `Exception during SERP API call: ${apiError.message}`;
              }
            }
          } else if (toolDecision.tool_name === "scrape_as_markdown") {
            const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
            const targetUrlToScrape = toolDecision.arguments.url;
            // Use BRIGHTDATA_WEB_UNLOCKER_ZONE from .env, fallback to 'mcp_unlocker' if not set
            const brightDataZone = process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE || 'mcp_unlocker';


            if (!brightDataApiToken) {
              console.error("BrightData API token not configured in environment variables.");
              toolOutput = "Error: BrightData API credentials not configured.";
            } else if (!targetUrlToScrape || typeof targetUrlToScrape !== 'string' || !targetUrlToScrape.startsWith('http')) {
              console.error("Invalid or missing URL for scraping:", targetUrlToScrape);
              toolOutput = "Error: A valid URL is required for scraping.";
            } else {
              try {
                console.log(`Calling BrightData API for URL: ${targetUrlToScrape} with zone: ${brightDataZone} to get markdown.`);
                const apiResponse = await fetch('https://api.brightdata.com/request', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${brightDataApiToken}`
                  },
                  body: JSON.stringify({
                    url: targetUrlToScrape,
                    zone: brightDataZone,
                    format: 'raw',
                    data_format: 'markdown'
                  })
                });

                if (apiResponse.ok) {
                  toolOutput = await apiResponse.text(); // Expecting Markdown text
                  console.log("BrightData API Output (Markdown snippet):", toolOutput.substring(0, 200) + "...");
                } else {
                  const errorText = await apiResponse.text();
                  console.error("BrightData API Error:", apiResponse.status, errorText);
                  toolOutput = `Error fetching page content via BrightData API: ${apiResponse.status} ${errorText}`;
                }
              } catch (apiError) {
                console.error("Error calling BrightData API:", apiError);
                toolOutput = `Exception during BrightData API call: ${apiError.message}`;
              }
            }
          } else if (toolDecision.tool_name === "scrape_as_html") {
            const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
            const brightDataZone = process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE;
            const targetUrlToScrape = toolDecision.arguments.url;

            toolOutput = `Executing scrape_as_html for ${targetUrlToScrape}\n`; // Initial part of toolOutput

            if (!brightDataApiToken || !brightDataZone) {
              console.error("BrightData API token or Zone not configured.");
              toolOutput += "Error: BrightData API credentials not configured.";
            } else if (!targetUrlToScrape || typeof targetUrlToScrape !== 'string' || !targetUrlToScrape.startsWith('http')) {
              console.error("Invalid or missing URL for scraping HTML:", targetUrlToScrape);
              toolOutput += "Error: A valid URL is required for scraping HTML.";
            } else {
              try {
                console.log(`Calling BrightData API for HTML scrape: ${targetUrlToScrape}`);
                const scrapeHtmlResponse = await fetch('https://api.brightdata.com/request', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${brightDataApiToken}`
                  },
                  body: JSON.stringify({
                    url: targetUrlToScrape,
                    zone: brightDataZone,
                    format: 'raw' // Get raw HTML
                  })
                });

                if (scrapeHtmlResponse.ok) {
                  const htmlContent = await scrapeHtmlResponse.text();
                  toolOutput = htmlContent; // Store the HTML content
                  console.log("BrightData HTML Scrape Output (snippet):", htmlContent.substring(0, 200) + "...");
                } else {
                  const errorText = await scrapeHtmlResponse.text();
                  console.error("BrightData HTML Scrape Error:", scrapeHtmlResponse.status, errorText);
                  toolOutput += `Error fetching HTML: ${scrapeHtmlResponse.status} ${errorText}`;
                }
              } catch (apiError) {
                console.error("Error calling BrightData API for HTML scrape:", apiError);
                toolOutput += `Exception during HTML scrape API call: ${apiError.message}`;
              }
            }
          } else if (toolDecision.tool_name === "web_data_linkedin_person_profile") {
            const brightDataApiToken = process.env.BRIGHTDATA_API_TOKEN;
            const profileUrl = toolDecision.arguments.url;
            const datasetId = 'gd_l1viktl72bvl7bjuj0'; // From MCP code

            toolOutput = `Fetching LinkedIn profile for ${profileUrl}\n`;

            if (!brightDataApiToken) {
              console.error("BrightData API token not configured.");
              toolOutput += "Error: BrightData API credentials not configured.";
            } else if (!profileUrl || typeof profileUrl !== 'string' || !profileUrl.includes('linkedin.com/in/')) {
              console.error("Invalid or missing LinkedIn profile URL:", profileUrl);
              toolOutput += "Error: A valid LinkedIn profile URL is required.";
            } else {
              try {
                console.log(`Triggering BrightData dataset for LinkedIn profile: ${profileUrl}`);
                const triggerResponse = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${brightDataApiToken}`
                  },
                  body: JSON.stringify([{ url: profileUrl }])
                });

                if (!triggerResponse.ok) {
                  const errorText = await triggerResponse.text();
                  throw new Error(`Dataset trigger failed: ${triggerResponse.status} ${errorText}`);
                }

                const triggerData = await triggerResponse.json();
                const snapshotId = triggerData?.snapshot_id;

                if (!snapshotId) {
                  throw new Error('No snapshot ID returned from dataset trigger.');
                }
                console.log(`Dataset triggered. Snapshot ID: ${snapshotId}`);
                toolOutput += `Data collection started (Snapshot ID: ${snapshotId}). Polling for results...\n`;

                let attempts = 0;
                const maxAttempts = 10;
                const pollInterval = 2500;

                while (attempts < maxAttempts) {
                  await new Promise(resolve => setTimeout(resolve, pollInterval));
                  attempts++;
                  console.log(`Polling snapshot ${snapshotId}, attempt ${attempts}/${maxAttempts}`);
                  const snapshotResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
                    headers: { 'Authorization': `Bearer ${brightDataApiToken}` }
                  });

                  if (!snapshotResponse.ok) {
                    console.warn(`Snapshot poll failed (attempt ${attempts}): ${snapshotResponse.status}`);
                    if (attempts >= maxAttempts) throw new Error('Polling attempts exhausted after non-ok response.');
                    continue;
                  }
                  
                  const snapshotData = await snapshotResponse.json();
                  if (snapshotData?.status === 'running' || snapshotData?.status === 'pending') {
                    if (attempts >= maxAttempts) throw new Error('Polling timeout: Data collection still running.');
                    continue;
                  }
                  
                  console.log('Snapshot data received:', snapshotData);
                  toolOutput = JSON.stringify(snapshotData, null, 2);
                  break;
                }
                if (attempts >= maxAttempts && !toolOutput.includes('{')) {
                   throw new Error('Polling timeout: Max attempts reached without completed data.');
                }

              } catch (apiError) {
                console.error("Error with LinkedIn Profile tool:", apiError);
                toolOutput = (toolOutput.startsWith("Fetching") ? toolOutput : "") + `Exception during LinkedIn Profile tool: ${apiError.message}`;
              }
            }
          } else {
            // Tool name recognized but arguments might be missing or incorrect
            console.warn("Tool recognized by AI but no specific command construction logic or arguments missing:", toolDecision);
            toolOutput = `Error: AI selected tool '${toolDecision.tool_name}' but it's not configured for execution or arguments are invalid.`;
          }

          // Second Gemini Call (Answer Synthesis)
          let finalPrompt;
          // Ensure userMessage is defined in this scope, it's from the top of POST function
          if (toolOutput) { // toolOutput will exist, even if it's an error message
            finalPrompt = `User query: "${userMessage}"
I used the '${effectiveToolName}' tool and received the following information:
---
${toolOutput}
---
Based on this information and the original query, please provide a comprehensive answer. If the information indicates an error, state that you couldn't retrieve the specific details but try to answer generally if possible.`;
          } else { // This case implies a tool was chosen, but toolOutput remained null (should be rare with current logic)
            finalPrompt = `User query: "${userMessage}"
Please answer this query directly. I attempted to use the '${effectiveToolName}' tool, but no output was generated.`;
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
          // No tool needed, get direct answer
          const finalPrompt = `User query: "${userMessage}"
Please answer this query directly.`;
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
          // Fallback if toolDecision is not in the expected format
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