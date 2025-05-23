// src/lib/ai-tools/amazonProductTool.js
export async function executeGetAmazonProduct(productUrl, apiToken) {
  let toolOutput = 'Fetching Amazon product data for ' + productUrl + '\\n';
  const datasetId = 'gd_l7q7dkf244hwjntr0'; // Dataset ID for Amazon Product

  if (!apiToken) {
    console.error("BrightData API token not configured for Amazon Product tool.");
    toolOutput += "Error: BrightData API credentials not configured.";
    return toolOutput;
  }
  if (!productUrl || typeof productUrl !== 'string' || !productUrl.includes('/dp/')) {
    console.error("Invalid or missing Amazon product URL (must contain /dp/) for Amazon Product tool:", productUrl);
    toolOutput += "Error: A valid Amazon product URL containing '/dp/' is required.";
    return toolOutput;
  }

  try {
    console.log('Triggering BrightData dataset for Amazon product: ' + productUrl);
    const triggerResponse = await fetch('https://api.brightdata.com/datasets/v3/trigger?dataset_id=' + datasetId + '&include_errors=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiToken
      },
      body: JSON.stringify([{ url: productUrl }]) 
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
    const maxAttempts = 10; 
    const pollInterval = 2500; 

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
      console.log('Polling snapshot ' + snapshotId + ' for Amazon product, attempt ' + attempts + '/' + maxAttempts);
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
      
      console.log('Amazon product snapshot data received.'); // Removed verbose data log
      toolOutput = JSON.stringify(snapshotData, null, 2); 
      break; 
    }
    if (attempts >= maxAttempts && (typeof toolOutput !== 'string' || !toolOutput.includes('{'))) {
       throw new Error('Polling timeout: Max attempts reached without completed data.');
    }
  } catch (apiError) {
    console.error("Error with Amazon Product tool:", apiError);
    toolOutput = (toolOutput.startsWith("Fetching") ? toolOutput : "") + 'Exception during Amazon Product tool: ' + apiError.message;
  }
  return toolOutput;
}