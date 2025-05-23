// src/lib/ai-tools/linkedinCompanyProfileTool.js
export async function executeGetLinkedInCompanyProfile(companyUrl, apiToken) {
  let toolOutput = 'Fetching LinkedIn company profile for ' + companyUrl + '\\n';
  const datasetId = 'gd_l1vikfnt1wgvvqz95w'; // Dataset ID for LinkedIn Company Profile

  if (!apiToken) {
    console.error("BrightData API token not configured for LinkedIn Company Profile tool.");
    toolOutput += "Error: BrightData API credentials not configured.";
    return toolOutput;
  }
  // Add URL validation if needed, e.g., must contain 'linkedin.com/company/'
  if (!companyUrl || typeof companyUrl !== 'string' || !companyUrl.includes('linkedin.com/company/')) {
    console.error("Invalid or missing LinkedIn company profile URL:", companyUrl);
    toolOutput += "Error: A valid LinkedIn company profile URL is required (e.g., containing '/company/').";
    return toolOutput;
  }

  try {
    console.log('Triggering BrightData dataset for LinkedIn company profile: ' + companyUrl);
    const triggerResponse = await fetch('https://api.brightdata.com/datasets/v3/trigger?dataset_id=' + datasetId + '&include_errors=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiToken
      },
      body: JSON.stringify([{ url: companyUrl }]) 
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
      console.log('Polling snapshot ' + snapshotId + ' for LinkedIn company profile, attempt ' + attempts + '/' + maxAttempts);
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
      
      console.log('LinkedIn company profile snapshot data received.');
      toolOutput = JSON.stringify(snapshotData, null, 2); 
      break; 
    }
    if (attempts >= maxAttempts && (typeof toolOutput !== 'string' || !toolOutput.includes('{'))) {
       throw new Error('Polling timeout: Max attempts reached without completed data.');
    }
  } catch (apiError) {
    console.error("Error with LinkedIn Company Profile tool:", apiError);
    toolOutput = (toolOutput.startsWith("Fetching") ? toolOutput : "") + 'Exception during LinkedIn Company Profile tool: ' + apiError.message;
  }
  return toolOutput;
}