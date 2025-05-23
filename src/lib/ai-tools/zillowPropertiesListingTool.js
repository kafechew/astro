// src/lib/ai-tools/zillowPropertiesListingTool.js
export async function executeGetZillowPropertiesListing(listingUrl, apiToken) {
  let toolOutput = 'Fetching Zillow properties listing data for: ' + listingUrl + '\\n';
  const datasetId = 'gd_lfqkr8wm13ixtbd8f5'; // Dataset ID for Zillow Properties Listing

  if (!apiToken) {
    console.error("BrightData API token not configured for Zillow Properties Listing tool.");
    toolOutput += "Error: BrightData API credentials not configured.";
    return toolOutput;
  }
  // Add URL validation if needed (e.g., must contain 'zillow.com/homedetails/')
  if (!listingUrl || typeof listingUrl !== 'string' || !listingUrl.includes('zillow.com/homedetails/')) {
    console.error("Invalid or missing Zillow properties listing URL:", listingUrl);
    toolOutput += "Error: A valid Zillow properties listing URL is required (e.g., containing '/homedetails/').";
    return toolOutput;
  }

  try {
    console.log('Triggering BrightData dataset for Zillow properties listing: ' + listingUrl);
    const triggerResponse = await fetch('https://api.brightdata.com/datasets/v3/trigger?dataset_id=' + datasetId + '&include_errors=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiToken
      },
      body: JSON.stringify([{ url: listingUrl }]) 
    });

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text();
      throw new Error('Dataset trigger failed: ' + triggerResponse.status + ' ' + errorText);
    }

    const triggerData = await triggerResponse.json();
    const snapshotId = triggerData?.snapshot_id;

    if (!snapshotId) {
      throw new Error('No snapshot ID returned from dataset trigger.');
    }
    console.log('Dataset triggered. Snapshot ID: ' + snapshotId);
    toolOutput += 'Data collection started (Snapshot ID: ' + snapshotId + '). Polling for results...\\n';

    let attempts = 0;
    const maxAttempts = 20; 
    const pollInterval = 5000; 

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
      console.log('Polling snapshot ' + snapshotId + ' for Zillow properties listing, attempt ' + attempts + '/' + maxAttempts);
      const snapshotResponse = await fetch('https://api.brightdata.com/datasets/v3/snapshot/' + snapshotId + '?format=json', {
        headers: { 'Authorization': 'Bearer ' + apiToken }
      });

      if (!snapshotResponse.ok) {
        console.warn('Snapshot poll failed (attempt ' + attempts + '): ' + snapshotResponse.status);
        if (attempts >= maxAttempts) throw new Error('Polling attempts exhausted after non-ok response.');
        continue;
      }
      
      const snapshotData = await snapshotResponse.json();
      if (snapshotData?.status === 'running' || snapshotData?.status === 'pending') { 
        if (attempts >= maxAttempts) throw new Error('Polling timeout: Data collection still running.');
        continue; 
      }
      
      console.log('Zillow properties listing snapshot data received.');
      toolOutput = JSON.stringify(snapshotData, null, 2); 
      break; 
    }
    if (attempts >= maxAttempts && (typeof toolOutput !== 'string' || !toolOutput.includes('{'))) {
       throw new Error('Polling timeout: Max attempts reached without completed data.');
    }
  } catch (apiError) {
    console.error("Error with Zillow Properties Listing tool:", apiError);
    toolOutput = (toolOutput.startsWith("Fetching") ? toolOutput : "") + 'Exception during Zillow Properties Listing tool: ' + apiError.message;
  }
  return toolOutput;
}