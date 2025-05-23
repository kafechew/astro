// src/lib/ai-tools/instagramPostsTool.js
export async function executeGetInstagramPosts(instagramUrl, apiToken) {
  let toolOutput = 'Fetching Instagram posts for ' + instagramUrl + '\\n';
  const datasetId = 'gd_lk5ns7kz21pck8jpis'; // Dataset ID for Instagram Posts

  if (!apiToken) {
    console.error("BrightData API token not configured for Instagram Posts tool.");
    toolOutput += "Error: BrightData API credentials not configured.";
    return toolOutput;
  }
  // Add URL validation if needed (e.g., must contain 'instagram.com/')
  if (!instagramUrl || typeof instagramUrl !== 'string' || !instagramUrl.includes('instagram.com/')) {
    console.error("Invalid or missing Instagram URL for Posts tool:", instagramUrl);
    toolOutput += "Error: A valid Instagram URL (profile or post) is required.";
    return toolOutput;
  }

  try {
    console.log('Triggering BrightData dataset for Instagram posts: ' + instagramUrl);
    const triggerResponse = await fetch('https://api.brightdata.com/datasets/v3/trigger?dataset_id=' + datasetId + '&include_errors=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiToken
      },
      body: JSON.stringify([{ url: instagramUrl }]) 
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
      console.log('Polling snapshot ' + snapshotId + ' for Instagram posts, attempt ' + attempts + '/' + maxAttempts);
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
      
      console.log('Instagram posts snapshot data received.');
      toolOutput = JSON.stringify(snapshotData, null, 2); 
      break; 
    }
    if (attempts >= maxAttempts && (typeof toolOutput !== 'string' || !toolOutput.includes('{'))) {
       throw new Error('Polling timeout: Max attempts reached without completed data.');
    }
  } catch (apiError) {
    console.error("Error with Instagram Posts tool:", apiError);
    toolOutput = (toolOutput.startsWith("Fetching") ? toolOutput : "") + 'Exception during Instagram Posts tool: ' + apiError.message;
  }
  return toolOutput;
}