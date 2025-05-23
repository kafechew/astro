// src/lib/ai-tools/facebookMarketplaceListingsTool.js
export async function executeGetFacebookMarketplaceListings(listingUrl, apiToken) {
  let toolOutput = 'Fetching Facebook Marketplace listing data for: ' + listingUrl + '\\n';
  const datasetId = 'gd_lvt9iwuh6fbcwmx1a'; // Dataset ID for Facebook Marketplace Listings

  if (!apiToken) {
    console.error("BrightData API token not configured for Facebook Marketplace Listings tool.");
    toolOutput += "Error: BrightData API credentials not configured.";
    return toolOutput;
  }
  // Add URL validation if needed (e.g., must contain 'facebook.com/marketplace/item/')
  if (!listingUrl || typeof listingUrl !== 'string' || !listingUrl.includes('facebook.com/marketplace/item/')) {
    console.error("Invalid or missing Facebook Marketplace listing URL:", listingUrl);
    toolOutput += "Error: A valid Facebook Marketplace listing URL is required (e.g., containing '/marketplace/item/').";
    return toolOutput;
  }

  try {
    console.log('Triggering BrightData dataset for Facebook Marketplace listing: ' + listingUrl);
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
      console.log('Polling snapshot ' + snapshotId + ' for Facebook Marketplace listing, attempt ' + attempts + '/' + maxAttempts);
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
      
      console.log('Facebook Marketplace listing snapshot data received.');
      toolOutput = JSON.stringify(snapshotData, null, 2); 
      break; 
    }
    if (attempts >= maxAttempts && (typeof toolOutput !== 'string' || !toolOutput.includes('{'))) {
       throw new Error('Polling timeout: Max attempts reached without completed data.');
    }
  } catch (apiError) {
    console.error("Error with Facebook Marketplace Listings tool:", apiError);
    toolOutput = (toolOutput.startsWith("Fetching") ? toolOutput : "") + 'Exception during Facebook Marketplace Listings tool: ' + apiError.message;
  }
  return toolOutput;
}