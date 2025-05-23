// src/lib/ai-tools/linkedinProfileTool.js
export async function executeGetLinkedInProfile(profileUrl, apiToken) {
  let toolOutput = 'Fetching LinkedIn profile for ' + profileUrl + '\\n';
  const datasetId = 'gd_l1viktl72bvl7bjuj0';

  if (!apiToken) {
    console.error("BrightData API token not configured for LinkedIn Profile tool.");
    toolOutput += "Error: BrightData API credentials not configured.";
    return toolOutput;
  }
  if (!profileUrl || typeof profileUrl !== 'string' || !profileUrl.includes('linkedin.com/in/')) {
    console.error("Invalid or missing LinkedIn profile URL for LinkedIn Profile tool:", profileUrl);
    toolOutput += "Error: A valid LinkedIn profile URL is required.";
    return toolOutput;
  }

  try {
    console.log('Triggering BrightData dataset for LinkedIn profile: ' + profileUrl);
    const triggerResponse = await fetch('https://api.brightdata.com/datasets/v3/trigger?dataset_id=' + datasetId + '&include_errors=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiToken
      },
      body: JSON.stringify([{ url: profileUrl }])
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
      console.log('Polling snapshot ' + snapshotId + ' for LinkedIn profile, attempt ' + attempts + '/' + maxAttempts);
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
      
      console.log('LinkedIn profile snapshot data received.'); // Removed verbose data log
      toolOutput = JSON.stringify(snapshotData, null, 2);
      break;
    }
    if (attempts >= maxAttempts && (typeof toolOutput !== 'string' || !toolOutput.includes('{'))) {
       throw new Error('Polling timeout: Max attempts reached without completed data.');
    }
  } catch (apiError) {
    console.error("Error with LinkedIn Profile tool:", apiError);
    toolOutput = (toolOutput.startsWith("Fetching") ? toolOutput : "") + 'Exception during LinkedIn Profile tool: ' + apiError.message;
  }
  return toolOutput;
}