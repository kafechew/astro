// src/lib/ai-tools/scrapeMarkdownTool.js
export async function executeScrapeMarkdown(url, apiToken, zone) {
  let toolOutput;
  if (!apiToken || !zone) {
    console.error("BrightData API token or Zone not configured for scrape_as_markdown tool.");
    return "Error: BrightData API credentials not configured for scrape_as_markdown tool.";
  }
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    console.error("Invalid or missing URL for scrape_as_markdown tool:", url);
    return "Error: A valid URL is required for scrape_as_markdown tool.";
  }

  try {
    console.log('Calling BrightData API for URL: ' + url + ' with zone: ' + zone + ' to get markdown.');
    const apiResponse = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiToken
      },
      body: JSON.stringify({
        url: url,
        zone: zone,
        format: 'raw',
        data_format: 'markdown'
      })
    });

    if (apiResponse.ok) {
      toolOutput = await apiResponse.text(); 
      console.log("BrightData API Output (Markdown snippet for scrape_as_markdown):", toolOutput.substring(0, 200) + "...");
    } else {
      const errorText = await apiResponse.text();
      console.error("BrightData API Error (scrape_as_markdown):", apiResponse.status, errorText);
      toolOutput = 'Error fetching page content as Markdown: ' + apiResponse.status + ' ' + errorText;
    }
  } catch (apiError) {
    console.error("Error calling BrightData API (scrape_as_markdown):", apiError);
    toolOutput = 'Exception during BrightData API call (scrape_as_markdown): ' + apiError.message;
  }
  return toolOutput;
}