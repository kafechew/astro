// src/lib/ai-tools/instagramCommentsTool.js
export async function executeGetInstagramComments(postUrl, apiToken) {
  let toolOutput = 'Fetching Instagram comments for post: ' + postUrl + '\\n';
  const datasetId = 'gd_ltppn085pokosxh13'; // Dataset ID for Instagram Comments

  if (!apiToken) {
    console.error("BrightData API token not configured for Instagram Comments tool.");
    toolOutput += "Error: BrightData API credentials not configured.";
    return toolOutput;
  }
  // Add URL validation if needed (e.g., must contain 'instagram.com/p/' or '/reel/')
  if (!postUrl || typeof postUrl !== 'string' || !(postUrl.includes('instagram.com/p/') || postUrl.includes('instagram.com/reel/'))) {
    console.error("Invalid or missing Instagram post/reel URL for Comments tool:", postUrl);
    toolOutput += "Error: A valid Instagram post or reel URL is required.";
    return toolOutput;
  }

  try {
    console.log('Triggering BrightData dataset for Instagram comments: ' + postUrl);
    const triggerResponse = await fetch('https://api.brightdata.com/datasets/v3/trigger?dataset_id=' + datasetId + '&include_errors=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiToken
      },
      body: JSON.stringify([{ url: postUrl }]) 
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
      console.log('Polling snapshot ' + snapshotId + ' for Instagram comments, attempt ' + attempts + '/' + maxAttempts);
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
      
      console.log('Instagram comments snapshot data received.');
      toolOutput = JSON.stringify(snapshotData, null, 2); 
      break; 
    }
    if (attempts >= maxAttempts && (typeof toolOutput !== 'string' || !toolOutput.includes('{'))) {
       throw new Error('Polling timeout: Max attempts reached without completed data.');
    }
  } catch (apiError) {
    console.error("Error with Instagram Comments tool:", apiError);
    toolOutput = (toolOutput.startsWith("Fetching") ? toolOutput : "") + 'Exception during Instagram Comments tool: ' + apiError.message;
  }
  return toolOutput;
}