// src/lib/ai-tools/scrapeHtmlTool.js
export async function executeScrapeHtml(url, apiToken, zone) {
  let toolOutput;
  // Initial message for toolOutput can be set here if desired, or handled in chat.js
  // toolOutput = 'Executing scrape_as_html for ' + url + '\\n';

  if (!apiToken || !zone) {
    console.error("BrightData API token or Zone not configured for scrape_as_html tool.");
    return "Error: BrightData API credentials not configured for scrape_as_html tool.";
  }
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    console.error("Invalid or missing URL for scrape_as_html tool:", url);
    return "Error: A valid URL is required for scrape_as_html tool.";
  }

  try {
    console.log('Calling BrightData API for HTML scrape: ' + url + ' with zone: ' + zone);
    const scrapeHtmlResponse = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiToken
      },
      body: JSON.stringify({
        url: url,
        zone: zone,
        format: 'raw' // Get raw HTML
      })
    });

    if (scrapeHtmlResponse.ok) {
      toolOutput = await scrapeHtmlResponse.text();
      console.log("BrightData HTML Scrape Output (snippet for scrape_as_html):", toolOutput.substring(0, 200) + "...");
    } else {
      const errorText = await scrapeHtmlResponse.text();
      console.error("BrightData HTML Scrape Error (scrape_as_html):", scrapeHtmlResponse.status, errorText);
      toolOutput = 'Error fetching HTML: ' + scrapeHtmlResponse.status + ' ' + errorText;
    }
  } catch (apiError) {
    console.error("Error calling BrightData API for HTML scrape (scrape_as_html):", apiError);
    toolOutput = 'Exception during HTML scrape API call (scrape_as_html): ' + apiError.message;
  }
  return toolOutput;
}