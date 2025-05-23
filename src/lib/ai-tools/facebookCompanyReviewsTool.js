// src/lib/ai-tools/facebookCompanyReviewsTool.js
export async function executeGetFacebookCompanyReviews(companyUrl, numOfReviews, apiToken) {
  let toolOutput = 'Fetching Facebook company reviews for: ' + companyUrl + '\\n';
  const datasetId = 'gd_m0dtqpiu1mbcyc2g86';

  if (!apiToken) {
    console.error("BrightData API token not configured for Facebook Company Reviews tool.");
    toolOutput += "Error: BrightData API credentials not configured.";
    return toolOutput;
  }
  if (!companyUrl || typeof companyUrl !== 'string' || !companyUrl.includes('facebook.com/')) {
    console.error("Invalid or missing Facebook company URL:", companyUrl);
    toolOutput += "Error: A valid Facebook company URL is required.";
    return toolOutput;
  }
  if (!numOfReviews || isNaN(parseInt(numOfReviews)) || parseInt(numOfReviews) <= 0) {
    console.error("Invalid or missing number of reviews:", numOfReviews);
    toolOutput += "Error: A valid number of reviews is required.";
    return toolOutput;
  }

  try {
    console.log('Triggering BrightData dataset for Facebook company reviews: ' + companyUrl + ', num_of_reviews: ' + numOfReviews);
    const triggerResponse = await fetch('https://api.brightdata.com/datasets/v3/trigger?dataset_id=' + datasetId + '&include_errors=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiToken
      },
      // Ensure the payload matches what the dataset expects for these inputs
      body: JSON.stringify([{ url: companyUrl, num_of_reviews: parseInt(numOfReviews) }]) 
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
      console.log('Polling snapshot ' + snapshotId + ' for Facebook company reviews, attempt ' + attempts + '/' + maxAttempts);
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
      
      console.log('Facebook company reviews snapshot data received.');
      toolOutput = JSON.stringify(snapshotData, null, 2); 
      break; 
    }
    if (attempts >= maxAttempts && (typeof toolOutput !== 'string' || !toolOutput.includes('{'))) {
       throw new Error('Polling timeout: Max attempts reached without completed data.');
    }
  } catch (apiError) {
    console.error("Error with Facebook Company Reviews tool:", apiError);
    toolOutput = (toolOutput.startsWith("Fetching") ? toolOutput : "") + 'Exception during Facebook Company Reviews tool: ' + apiError.message;
  }
  return toolOutput;
}