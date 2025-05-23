# Plan: Integrating BrightData Browser Automation Tools into AI Chatbot

This document outlines the strategy for integrating BrightData browser automation tools, using the BrightData MCP client, into the existing AI chatbot application.

## 1. Overview of New Architecture

The integration will adopt a model where a new Node.js service manages the BrightData MCP client (which includes browser tools) and handles AI agent orchestration.

*   **Astro Application (Existing):**
    *   The current Astro application, specifically its [`/api/ai/chat.js`](src/pages/api/ai/chat.js:0) API route, will act as a proxy to the new Node.js Agent & Tool Service.
    *   It will primarily forward user queries to the new service and return its responses.

*   **Node.js Agent & Tool Service (New):**
    *   A new, standalone Node.js application will be developed and deployed (e.g., on Render.com).
    *   This service will be responsible for:
        *   Managing the BrightData MCP client (`npx @brightdata/mcp`) as a persistent child process.
        *   Communicating with the MCP client (e.g., via stdio or HTTP if the MCP client supports it).
        *   Implementing the ReAct agent loop (interacting with Vertex AI Gemini for tool decisions and answer synthesis).
        *   Executing browser automation commands by sending instructions to the MCP client.

Communication between the Astro application's [`chat.js`](src/pages/api/ai/chat.js:0) and the Node.js Agent & Tool Service will occur via synchronous HTTP API calls.

## 2. Node.js Agent & Tool Service (To be deployed on Render.com)

This service will encapsulate all agentic logic, MCP client management, and browser-related operations.

*   **Title:** Node.js Agent & Tool Service (To be deployed on Render.com)

*   **Technology Stack:**
    *   **Node.js:** Runtime environment.
    *   **Express.js (or similar lightweight framework):** For creating API endpoints.
    *   **Playwright:** Used indirectly via the BrightData MCP client's dependencies.
    *   **BrightData MCP Client Logic:** The service will manage and interact with the `npx @brightdata/mcp` client.
    *   **`dotenv`:** For managing environment variables.
    *   **Vertex AI SDK (or direct API calls):** For interacting with Gemini.

*   **Core Logic Adaptation:**
    *   **MCP Client Management:** The service will launch and manage the `npx @brightdata/mcp` client as a persistent child process using Node.js `child_process.spawn`.
    *   **MCP Communication:** It will implement stdio communication (stdin/stdout) to send commands to and receive results from the MCP child process. Alternatively, if the MCP client can be run as an HTTP server, this service could communicate with it via HTTP.
    *   **ReAct Loop Implementation:** This service will contain the core ReAct agent loop:
        1.  Receive user query via its HTTP API (e.g., `/invoke-agent`).
        2.  Call Vertex AI (Gemini) with the query and available tool definitions (primarily those exposed by the MCP client) to get a tool decision.
        3.  Execute the chosen tool by sending the appropriate command and arguments to the MCP child process.
        4.  Receive the tool execution result from the MCP client.
        5.  Call Vertex AI (Gemini) again with the tool results to synthesize a final answer or decide on the next step.
        6.  Return the final answer/response via its API.

*   **API Endpoint Definitions:**
    *   The service will likely expose one primary endpoint, for example:
        *   `POST /invoke-agent` or `POST /chat`
            *   Request Body: `{ "query": "User's natural language query" }`
            *   Response: `{ "status": "success", "answer": "AI-generated response", "tool_usage": [...] }` or `{ "status": "error", "message": "Error details" }`
    *   Individual tool endpoints like `/navigate`, `/click` are less relevant as direct external APIs, as the agent logic within this service will handle tool execution internally based on Gemini's decisions.

*   **Environment Variables Required by this Service:**
    *   `BROWSER_AUTH`: (Required for MCP) Credentials from BrightData for the MCP client (e.g., `brd-customer-CUSTOMER_ID-zone-YOUR_ZONE-session-SESSION_ID:PASSWORD`).
    *   `API_TOKEN`: (Required for MCP, if applicable) API token for BrightData MCP.
    *   `GOOGLE_PROJECT_ID`: (Required for Vertex AI) Google Cloud Project ID.
    *   `GOOGLE_CLIENT_EMAIL`: (Required for Vertex AI) Google Cloud service account email.
    *   `GOOGLE_PRIVATE_KEY`: (Required for Vertex AI) Google Cloud service account private key.
    *   `PORT`: (Required) The port on which the HTTP server will listen (e.g., `3001`, or dynamically assigned by Render using `process.env.PORT`).
    *   `API_KEY_SHARED_SECRET`: (Optional but Recommended) A shared secret string used as an API key to secure this service if its endpoint is publicly accessible.

*   **Session Management:**
    *   **Browser State:** The `Browser_session.js` logic, now managed by the BrightData MCP client itself, will handle the browser state (cookies, active page, etc.).
    *   **Conversation/Tool Stats:** If session state for the conversation (e.g., history for context) or tool usage statistics is desired, this Node.js service would need to manage it (e.g., in-memory for simple cases, or using a database for persistence).

*   **Error Handling:**
    *   This service will report errors originating from the MCP client, Vertex AI (Gemini), or its own internal logic back to the Astro API proxy ([`chat.js`](src/pages/api/ai/chat.js:0)).
    *   It will use standard HTTP status codes and JSON error responses.

## 3. Modifications to Astro API Route (`src/pages/api/ai/chat.js`)

The existing Astro API route will be simplified to primarily act as a proxy to the new Node.js Agent & Tool Service.

*   **New Environment Variable:**
    *   Change `BROWSER_AUTOMATION_SERVICE_URL` to `NODE_AGENT_SERVICE_URL`. This variable will store the base URL of the deployed Node.js Agent & Tool Service (e.g., `https://my-node-agent-service.onrender.com`).

*   **Updating `availableTools` Array:**
    *   The `availableTools` array and the initial tool decision logic will primarily reside within the Node.js Agent & Tool Service, as it makes the first call to Gemini.
    *   [`chat.js`](src/pages/api/ai/chat.js:0) might not need to be aware of the specific tools anymore. It would simply forward the user's message.
    *   Alternatively, [`chat.js`](src/pages/api/ai/chat.js:0) could still pass the user message and perhaps a *general* list of capabilities or the full list of tools to the Node.js service, which then constructs the precise prompt for Gemini. For now, assume [`chat.js`](src/pages/api/ai/chat.js:0) just forwards the message to the agent service.

*   **Tool Execution Logic:**
    *   This section in [`chat.js`](src/pages/api/ai/chat.js:0) will be drastically simplified.
    *   It will make one `fetch` call to the `NODE_AGENT_SERVICE_URL` (e.g., to its `/invoke-agent` endpoint) with the user's message.
    *   It will then await the response from the Node.js Agent & Tool Service and return this response (which includes the AI's final answer) to the client.
    *   The complex logic of interacting with Gemini for tool selection, executing tools, and synthesizing answers will be handled by the Node.js service.

## 4. Development and Deployment Workflow

Adjust steps to reflect developing and deploying a Node.js service on Render.com that includes the MCP client and agent logic:

1.  **Step 1: Develop Node.js Agent & Tool Service Locally:**
    *   Create the Node.js/Express.js service.
    *   Implement logic to spawn and manage the `npx @brightdata/mcp` child process.
    *   Implement stdio communication with the MCP process.
    *   Develop the ReAct loop:
        *   API endpoint to receive user query.
        *   Vertex AI (Gemini) call for tool decision.
        *   Logic to send commands to MCP based on Gemini's decision.
        *   Vertex AI (Gemini) call for answer synthesis.
    *   Test thoroughly using local requests (e.g., with `curl` or Postman). Ensure `BROWSER_AUTH`, `API_TOKEN` (if needed for MCP), and Google Cloud credentials are correctly configured for local testing.

2.  **Step 2: Update and Test `chat.js` Locally:**
    *   Add the `NODE_AGENT_SERVICE_URL` environment variable to the Astro project's `.env` file, pointing to the local Node.js Agent & Tool Service (e.g., `http://localhost:3001`).
    *   Simplify [`chat.js`](src/pages/api/ai/chat.js:0) to make a single `fetch` call to the local Node.js service.
    *   Test the end-to-end flow locally by interacting with the chatbot.

3.  **Step 3: Deploy Node.js Agent & Tool Service to Render.com:**
    *   Prepare the service for deployment (e.g., `Dockerfile` if needed, or configure Render's native Node.js build).
    *   Set up a new "Web Service" on Render.com.
    *   Configure environment variables on Render: `BROWSER_AUTH`, `API_TOKEN` (if MCP needs it), `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `PORT` (Render typically provides this), and `API_KEY_SHARED_SECRET` (if used).
    *   Deploy the service and ensure it's running correctly by testing its public URL.

4.  **Step 4: Update Astro App Environment Variable:**
    *   In the Vercel project settings (or wherever the Astro app is hosted), update the `NODE_AGENT_SERVICE_URL` environment variable to point to the live URL of the Node.js Agent & Tool Service on Render.com.

5.  **Step 5: Test End-to-End Deployed Flow:**
    *   Thoroughly test the entire system with both services deployed.
    *   Monitor logs on both Render.com and Vercel.

## 5. Security Considerations

Remains relevant for the new Node.js service. Securing the Node.js Agent & Tool Service is important:

*   **Shared Secret / API Key:**
    *   Implement a simple shared secret (API key) mechanism using the `API_KEY_SHARED_SECRET` environment variable. The Node.js service would require an `X-API-Key` header. [`chat.js`](src/pages/api/ai/chat.js:0) would include this header.
*   **Render.com Private Services:** (Consider if applicable for other internal services, less so for Vercel-to-Render).
*   **IP Whitelisting:** (Can be complex to maintain).
*   **Regular Dependency Updates:** Keep all packages updated.

A shared secret is recommended for the initial phase.

## 6. Iterative Implementation Plan

The focus shifts to building the Node.js Agent & Tool Service.

1.  **Phase 1: Core Node.js Service & MCP Integration:**
    *   Develop the Node.js service to launch and manage the `npx @brightdata/mcp` client as a child process.
    *   Implement basic stdio communication to send a simple command (e.g., a navigate command) to MCP and receive its output.
    *   Expose a simple API endpoint on the Node.js service that triggers this test command.
    *   Test this core functionality locally.

2.  **Phase 2: Basic ReAct Loop with Vertex AI:**
    *   Integrate the Vertex AI SDK.
    *   Implement a basic ReAct loop:
        *   Receive query.
        *   Call Gemini (with a predefined simple tool like "navigate").
        *   Execute the "navigate" command via MCP.
        *   Call Gemini again with the result to synthesize an answer.
    *   Update [`chat.js`](src/pages/api/ai/chat.js:0) to call this service.
    *   Test end-to-end locally and then deployed.

3.  **Phase 3: Expand Toolset & Refine Agent:**
    *   Incrementally add more tools exposed by the MCP client to the agent's capabilities.
    *   Refine prompting for Gemini for better tool selection and answer synthesis.
    *   Improve error handling and reporting.

4.  **Phase 4: Advanced Features & Refinements (Future):**
    *   Consider more advanced error handling, retry mechanisms.
    *   Evaluate conversation history management within the Node.js service.
    *   Enhance security measures as needed.

This phased approach allows for early validation of the Node.js service architecture and iterative development of the agent capabilities.