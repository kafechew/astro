# Plan: Integrating BrightData Browser Automation Tools into AI Chatbot

This document outlines the strategy for integrating BrightData browser automation tools, using `browser_tools.js` and `browser_session.js` as a reference, into the existing AI chatbot application.

## 1. Overview of New Architecture

The integration will adopt a two-service model to separate concerns and manage resources effectively:

*   **Astro Application (Existing):**
    *   The current Astro application, specifically its [`/api/ai/chat.js`](src/pages/api/ai/chat.js:0) API route, will continue to act as the primary orchestrator.
    *   It will handle user interactions, manage the conversation flow with the Gemini AI, and delegate browser automation tasks to the new Browser Automation Service.

*   **Browser Automation Service (New):**
    *   A new, standalone Node.js service will be developed and deployed on Render.com.
    *   This service will be solely responsible for managing Playwright browser sessions and executing browser automation commands (e.g., navigation, clicks, data extraction).

Communication between the Astro application's [`chat.js`](src/pages/api/ai/chat.js:0) and the Browser Automation Service will occur via synchronous HTTP API calls. [`chat.js`](src/pages/api/ai/chat.js:0) will make requests to the Browser Automation Service, await its responses, and then use the results to inform the AI or respond to the user.

## 2. Browser Automation Service (To be deployed on Render.com)

This service will encapsulate all browser-related operations.

*   **Technology Stack:**
    *   **Node.js:** Runtime environment.
    *   **Express.js (or Fastify):** A lightweight web framework for creating API endpoints.
    *   **Playwright:** For browser automation and control.
    *   **`dotenv`:** For managing environment variables.

*   **Core Logic Adaptation:**
    *   **`browser_session.js`:** The logic from `browser_session.js` (specifically the `Browser_session` class) will be adapted to manage persistent connections to BrightData's scraping browsers. It will use the `BROWSER_AUTH` environment variable to connect via CDP. This class is designed to handle multiple domains within a single browser instance.
    *   **`browser_tools.js`:** Functions from `browser_tools.js` (e.g., `scraping_browser_navigate`, `scraping_browser_click`, `scraping_browser_get_text`, `scraping_browser_links`, `scraping_browser_type`, `scraping_browser_screenshot`, etc.) will be wrapped and exposed as individual API endpoints. Each endpoint will interact with the `Browser_session` instance to perform the requested action.

*   **API Endpoint Definitions (Examples):**
    *   `POST /navigate`
        *   Request Body: `{ "url": "https://example.com" }`
        *   Response: `{ "status": "success", "message": "Navigated to URL", "pageTitle": "Example Domain", "currentUrl": "https://example.com" }` or `{ "status": "error", "message": "Failed to navigate" }`
    *   `POST /click`
        *   Request Body: `{ "selector": "#myButton" }`
        *   Response: `{ "status": "success", "message": "Clicked element" }` or `{ "status": "error", "message": "Element not found or not clickable" }`
    *   `GET /get_text`
        *   Response: `{ "status": "success", "text": "Page content...", "message": "Text retrieved" }` or `{ "status": "error", "message": "Failed to get text" }`
    *   `GET /get_links`
        *   Response: `{ "status": "success", "links": [{ "text": "Link 1", "href": "/page1", "selector": "a.link1" }, ...], "message": "Links retrieved" }` or `{ "status": "error", "message": "Failed to get links" }`
    *   `POST /type`
        *   Request Body: `{ "selector": "input[name='q']", "text": "search query", "submit": true }`
        *   Response: `{ "status": "success", "message": "Text typed and form submitted" }` or `{ "status": "error", "message": "Failed to type or submit" }`
    *   `GET /screenshot`
        *   Request Query (optional): `?full_page=true`
        *   Response: `{ "status": "success", "message": "Screenshot taken", "imageData": "data:image/png;base64,..." }` (or a link to the image if stored temporarily) or `{ "status": "error", "message": "Failed to take screenshot" }`
    *   `GET /get_html`
        *   Request Query (optional): `?full_page=true`
        *   Response: `{ "status": "success", "html": "<html>...</html>", "message": "HTML retrieved" }` or `{ "status": "error", "message": "Failed to get HTML" }`
    *   `POST /go_back`
        *   Response: `{ "status": "success", "message": "Navigated back" }` or `{ "status": "error", "message": "Cannot go back" }`
    *   `POST /go_forward`
        *   Response: `{ "status": "success", "message": "Navigated forward" }` or `{ "status": "error", "message": "Cannot go forward" }`
    *   `POST /wait_for`
        *   Request Body: `{ "selector": "#dynamicElement", "timeout": 5000 }`
        *   Response: `{ "status": "success", "message": "Element found" }` or `{ "status": "error", "message": "Timeout waiting for element" }`

*   **Environment Variables Required by this Service:**
    *   `BROWSER_AUTH`: (Required) Credentials from BrightData (e.g., `brd-customer-CUSTOMER_ID-zone-YOUR_ZONE-session-SESSION_ID:PASSWORD`) for Playwright to connect to the scraping browser.
    *   `PORT`: (Required) The port on which the HTTP server will listen (e.g., `3001`, or dynamically assigned by Render using `process.env.PORT`).
    *   `API_KEY_SHARED_SECRET`: (Optional but Recommended) A shared secret string used as an API key to secure the service if its endpoint is publicly accessible. This would be passed in an HTTP header (e.g., `X-API-Key`).

*   **Deployment Platform:**
    *   Render.com (as a Web Service). This allows for easy deployment, scaling, and management of Node.js applications.

*   **Session Management within the Service:**
    *   A single, global instance of the `Browser_session` class will be instantiated when the service starts. This simplifies the initial implementation, as the `Browser_session` class itself is designed to manage connections to BrightData and can handle operations across different domains within that single browser context.
    *   If future needs require more complex session management (e.g., per-user sessions or a pool of browser instances for higher concurrency), this can be revisited. For now, the global instance is sufficient.

*   **Error Handling:**
    *   The service will use standard HTTP status codes to indicate success or failure (e.g., `200 OK`, `400 Bad Request`, `500 Internal Server Error`).
    *   Error details will be provided in a JSON response body, e.g., `{ "status": "error", "message": "Specific error description" }`.
    *   This allows [`chat.js`](src/pages/api/ai/chat.js:0) to gracefully handle issues and provide informative feedback to the AI or user.

## 3. Modifications to Astro API Route (`src/pages/api/ai/chat.js`)

The existing Astro API route will be updated to interact with the new Browser Automation Service.

*   **New Environment Variable:**
    *   `BROWSER_AUTOMATION_SERVICE_URL`: This variable will store the base URL of the deployed Browser Automation Service on Render.com (e.g., `https://my-browser-service.onrender.com`).

*   **Updating `availableTools` Array:**
    *   The `availableTools` array, used to inform Gemini about available functions, will be expanded.
    *   Each relevant `scraping_browser_*` tool will be added with:
        *   A clear `name` (e.g., `scraping_browser_navigate`).
        *   A concise `description` explaining what the tool does and when to use it.
        *   An `input_schema` defining the expected arguments (e.g., `{ "type": "object", "properties": { "url": { "type": "string", "description": "The URL to navigate to." } }, "required": ["url"] }` for `scraping_browser_navigate`).

*   **Tool Execution Logic:**
    *   When Gemini decides to use a `scraping_browser_*` tool:
        1.  **Construct Request:** [`chat.js`](src/pages/api/ai/chat.js:0) will identify the tool and its arguments. It will then construct an HTTP request to the Browser Automation Service:
            *   **Method:** `POST` or `GET` as appropriate for the endpoint.
            *   **URL:** Formed by concatenating `process.env.BROWSER_AUTOMATION_SERVICE_URL` with the specific tool's endpoint path (e.g., `/navigate`).
            *   **Headers:** `Content-Type: application/json`. If an `API_KEY_SHARED_SECRET` is implemented, an `X-API-Key` header will be included.
            *   **Body:** For `POST` requests, the arguments provided by Gemini will be sent as a JSON payload.
        2.  **Make API Call:** Use the native `fetch` API to send the request to the Browser Automation Service.
        3.  **Process Response:**
            *   Await the response from the service.
            *   Parse the JSON response.
            *   If the service indicates an error (e.g., non-2xx status code or `status: "error"` in JSON), format an appropriate error message.
            *   If successful, extract the relevant data from the response.
        4.  **Store Output:** The processed data (or error message) will be stored in the `toolOutput` variable.
        5.  **Inform AI:** The existing logic where a second call is made to Gemini with the `toolOutput` will then use this information to synthesize the final user-facing answer.

## 4. Development and Deployment Workflow

A step-by-step approach will be followed:

1.  **Step 1: Develop Browser Automation Service Locally:**
    *   Create the Node.js/Express.js (or Fastify) service.
    *   Integrate `browser_session.js` and adapt `browser_tools.js` functions into API endpoints.
    *   Test thoroughly using local requests (e.g., with `curl` or Postman) to `http://localhost:3001` (or chosen local port). Ensure `BROWSER_AUTH` is correctly configured.

2.  **Step 2: Update and Test `chat.js` Locally:**
    *   Add the `BROWSER_AUTOMATION_SERVICE_URL` environment variable to the Astro project's `.env` file, pointing to the local Browser Automation Service (e.g., `http://localhost:3001`).
    *   Update the `availableTools` in [`chat.js`](src/pages/api/ai/chat.js:0).
    *   Implement the `fetch` logic in [`chat.js`](src/pages/api/ai/chat.js:0) to call the local service.
    *   Test the end-to-end flow locally by interacting with the chatbot and triggering browser automation tools.

3.  **Step 3: Deploy Browser Automation Service to Render.com:**
    *   Prepare the service for deployment (e.g., `Dockerfile` if needed, or configure Render's native Node.js build).
    *   Set up a new "Web Service" on Render.com.
    *   Configure environment variables on Render: `BROWSER_AUTH`, `PORT` (Render typically provides this), and `API_KEY_SHARED_SECRET` (if used).
    *   Deploy the service and ensure it's running correctly by testing its public URL.

4.  **Step 4: Update Astro App Environment Variable:**
    *   In the Vercel project settings (or wherever the Astro app is hosted), update the `BROWSER_AUTOMATION_SERVICE_URL` environment variable to point to the live URL of the Browser Automation Service on Render.com.

5.  **Step 5: Test End-to-End Deployed Flow:**
    *   Thoroughly test the entire system with both services deployed to their respective platforms.
    *   Monitor logs on both Render.com and Vercel for any issues.

## 5. Security Considerations

Securing the Browser Automation Service is important, especially if its endpoint on Render.com is publicly accessible:

*   **Shared Secret / API Key:**
    *   Implement a simple shared secret (API key) mechanism. The Browser Automation Service would require an `X-API-Key` header with a pre-configured secret value. [`chat.js`](src/pages/api/ai/chat.js:0) would include this header in its requests. This is the most straightforward approach for initial implementation.
*   **Render.com Private Services:**
    *   If both the Astro app and the Browser Automation Service were on Render, private services could be used for network isolation. However, since the Astro app is on Vercel, this is not directly applicable for inter-service communication.
*   **IP Whitelisting:**
    *   Render might offer firewall rules to whitelist incoming IP addresses. This could restrict access to only known Vercel egress IPs, but these IPs can change and might be extensive, making this complex to maintain.
*   **Regular Dependency Updates:** Keep all packages (Node.js, Express, Playwright, etc.) updated to patch known vulnerabilities.

For the initial phase, a shared secret (`API_KEY_SHARED_SECRET`) is recommended.

## 6. Iterative Implementation Plan

To manage complexity and ensure a stable rollout, an iterative approach is advised:

1.  **Phase 1: Core Setup & Basic Tools:**
    *   Implement the Browser Automation Service with the `Browser_session` manager.
    *   Expose two fundamental tools as API endpoints:
        *   `scraping_browser_navigate`
        *   `scraping_browser_get_text`
    *   Update [`chat.js`](src/pages/api/ai/chat.js:0) to integrate these two tools.
    *   Thoroughly test this minimal setup locally and then deployed. This will validate the architecture and communication flow.

2.  **Phase 2: Expand Toolset:**
    *   Incrementally add other key browser tools from `browser_tools.js` (e.g., `scraping_browser_click`, `scraping_browser_links`, `scraping_browser_type`, `scraping_browser_screenshot`) one by one or in small batches.
    *   For each new tool, update the API service, update `availableTools` in [`chat.js`](src/pages/api/ai/chat.js:0), and test thoroughly.

3.  **Phase 3: Advanced Features & Refinements (Future):**
    *   Consider more advanced error handling and retry mechanisms.
    *   Evaluate the need for more sophisticated session management in the Browser Automation Service if usage scales.
    *   Enhance security measures as needed.

This phased approach allows for early feedback and reduces the risk associated with a large, monolithic integration.