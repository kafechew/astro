// src/lib/ai-tools/searchEngineTool.js
export async function executeSearchEngine(query, apiToken, zone) {
  let toolOutput;
  if (!apiToken || !zone) {
    console.error("BrightData API token or Zone not configured for search_engine tool.");
    return "Error: BrightData SERP API credentials not configured for search_engine tool.";
  }
  if (!query || typeof query !== 'string') {
    console.error("Invalid or missing query for search_engine tool:", query);
    return "Error: A valid query is required for search_engine tool.";
  }

  try {
    const targetUrl = 'https://www.google.com/search?q=' + encodeURIComponent(query) + '&brd_json=1';
    console.log('Calling BrightData SERP API for query: ' + query + ' via URL: ' + targetUrl);
    const serpResponse = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiToken
      },
      body: JSON.stringify({
        zone: zone,
        url: targetUrl,
        format: 'raw'
      })
    });

    if (serpResponse.ok) {
      const serpData = await serpResponse.json();
      toolOutput = JSON.stringify(serpData, null, 2);
      console.log("BrightData SERP API Output (search_engine tool):", toolOutput.substring(0, 200) + "...");
    } else {
      const errorText = await serpResponse.text();
      console.error("BrightData SERP API Error (search_engine tool):", serpResponse.status, errorText);
      toolOutput = 'Error fetching search results: ' + serpResponse.status + ' ' + errorText;
    }
  } catch (apiError) {
    console.error("Error calling BrightData SERP API (search_engine tool):", apiError);
    toolOutput = 'Exception during SERP API call (search_engine tool): ' + apiError.message;
  }
  return toolOutput;
}