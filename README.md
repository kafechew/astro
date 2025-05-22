# Astro + Vertex AI + BrightData: Advanced AI Chatbot

This project demonstrates an advanced AI chatbot built with [Astro](https://astro.build/), leveraging Google's Gemini model via Vertex AI and live web search capabilities through the BrightData SERP API.
The primary feature is an AI chat page available at `/ai`, offering users an interactive way to get information, including up-to-date details fetched from the internet.

<!-- TODO: Add screenshot of the application UI here -->
## Core Features

*   **Google Vertex AI (Gemini model) Integration:** Utilizes Google's powerful Gemini model through Vertex AI for sophisticated language understanding and generation.
*   **Live Web Search via BrightData SERP API:** Enables the chatbot to fetch real-time information from the web to answer queries, ensuring responses are current.
*   **Dynamic UI:** A new interactive chat interface at `/ai` (powered by [`src/components/ChatInterface.astro`](src/components/ChatInterface.astro:1)) provides a modern user experience.
*   **Astro API Routes:** The new [`/api/ai/chat.js`](src/pages/api/ai/chat.js:1) route orchestrates interactions between the frontend, Vertex AI, and BrightData.
*   **Secure API Key Management:** Uses a `.env` file for `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` (for Vertex AI), `BRIGHTDATA_API_TOKEN`, `BRIGHTDATA_WEB_UNLOCKER_ZONE` (for BrightData), and `GEMINI_API_KEY` (backup).

## Prerequisites

*   Node.js v18.x or later
*   Basic understanding of Astro
*   Google Cloud Project with Vertex AI enabled.
*   Service account credentials (JSON key file or individual environment variables) for Vertex AI.
*   BrightData account and SERP API credentials (API Token, Zone).
*   A [Google AI / Gemini API Key](https://aistudio.google.com/app/apikey) (if `geminiService.js` is retained for other purposes or as a fallback).

## Project Structure Highlights

```text
/
├── public/                  # Static assets
├── src/
│   ├── components/
│   │   ├── ChatInterface.astro  # Astro: Interactive chat interface for the /ai page.
│   │   ├── BlogList.jsx         # React: Displays blogs (potentially less central if Q&A is deprecated)
│   │   ├── Footer.astro         # Astro: Site footer
│   │   ├── Navbar.astro         # Astro: Site navigation
│   │   └── QnaForm.astro        # Astro: Original Gemini Q&A form (role might be reduced or deprecated in favor of /ai)
│   ├── layouts/                 # Astro layouts (MainLayout.astro, BlogPostLayout.astro etc.)
│   ├── pages/
│   │   ├── ai.astro             # Astro: Main AI chat page with two-panel layout.
│   │   ├── index.astro          # Main page (original landing, /ai is the new chat focus)
│   │   ├── blog/                # Blog post markdown files
│   │   └── api/
│   │       ├── ai/
│   │       │   └── chat.js      # API: Orchestrates AI responses, including tool decisions and BrightData SERP API calls.
│   │       ├── askQna.json.js   # API: Original Q&A endpoint (superseded by /api/ai/chat.js for new functionality)
│   │       └── getPermissions.json.js # API: Handles blog permissions (review for removal if unused by new chat)
│   ├── services/
│   │   ├── vertexAiService.js   # Module for Vertex AI (Gemini model) interaction.
│   │   └── geminiService.js     # Module for original Gemini API interaction (review for relevance)
│   └── utils/
│       └── blogs.js             # Sample blog data
├── .env                       # (Create this) Stores API keys for Vertex AI, BrightData, and potentially Gemini
├── astro.config.mjs           # Astro configuration
├── package.json
└── README.md
```

## Setup Instructions

1.  **Clone the Repository:**
    ```bash
    # git clone <your-repo-url>
    # cd <repo-directory>
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    *   Create a `.env` file in the project root.
    *   Add your API keys and configuration. Handle multi-line private keys carefully (e.g., by wrapping in quotes or using `\\n` for newlines if your environment loader supports it).
        ```env
        # Google Vertex AI Credentials
        GOOGLE_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
        GOOGLE_CLIENT_EMAIL="<YOUR_GCP_SERVICE_ACCOUNT_EMAIL>"
        GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_KEY_PART_1\\nYOUR_KEY_PART_2\\n-----END PRIVATE KEY-----\\n" # Ensure newlines are correctly formatted

        # BrightData Credentials
        BRIGHTDATA_API_TOKEN="<YOUR_BRIGHTDATA_API_TOKEN>"
        BRIGHTDATA_WEB_UNLOCKER_ZONE="<YOUR_BRIGHTDATA_ZONE>" # Or relevant SERP zone

        # Optional: Original Gemini API Key (if still used)
        # GEMINI_API_KEY="<YOUR_GEMINI_API_KEY>"
        ```

## Running the Application

1.  **Start Development Server:**
    ```bash
    npm run dev
    ```
2.  **Access:** Open `http://localhost:4321` in your browser.

## How It Works: AI Chat Flow (`/ai` page)

The new AI chat functionality follows a ReAct (Reasoning and Acting) pattern:

1.  **User Input:** The user sends a message through the [`ChatInterface.astro`](src/components/ChatInterface.astro:1) component on the `/ai` page.
2.  **API Request:** The interface makes a `POST` request to the [`/api/ai/chat.js`](src/pages/api/ai/chat.js:1) endpoint.
3.  **First LLM Call (Vertex AI - Gemini):** The [`chat.js`](src/pages/api/ai/chat.js:1) API route sends the user's query and conversation history to the Gemini model via [`vertexAiService.js`](src/services/vertexAiService.js:1). This initial call aims to understand the query and determine if any external tools (like web search) are needed to formulate an answer. The model might respond with a plan to use a tool.
4.  **Tool Execution (BrightData SERP API):** If Gemini decides a web search is necessary (e.g., by indicating the `search_engine` tool), [`chat.js`](src/pages/api/ai/chat.js:1) makes a call to the BrightData SERP API using the `BRIGHTDATA_API_TOKEN` and `BRIGHTDATA_WEB_UNLOCKER_ZONE` to fetch live search results for the query.
5.  **Second LLM Call (Vertex AI - Gemini):** The results from the BrightData API (if a tool was used) are then sent back to the Gemini model, along with the original query and context. Gemini synthesizes this information to generate a comprehensive final answer.
6.  **Streaming Response:** The final answer from Gemini is streamed back to [`ChatInterface.astro`](src/components/ChatInterface.astro:1), where it is displayed to the user, with support for Markdown rendering.

## Deployment

This project is configured for Vercel serverless deployment (`@astrojs/vercel/serverless`). Adapt `astro.config.mjs` for other platforms (e.g., Netlify).

**Key Deployment Steps:**

*   Push code to a Git provider (GitHub, GitLab, etc.).
*   Import the project into your hosting platform (e.g., Vercel).
*   **Configure Environment Variables:** Set the following in your platform's settings:
    *   `GOOGLE_PROJECT_ID`
    *   `GOOGLE_CLIENT_EMAIL`
    *   `GOOGLE_PRIVATE_KEY` (ensure multi-line values are handled correctly by your platform)
    *   `BRIGHTDATA_API_TOKEN`
    *   `BRIGHTDATA_WEB_UNLOCKER_ZONE`
    *   `GEMINI_API_KEY` (if still applicable)
*   **Build Settings:** Ensure Build Command is `npm run build` and the Output Directory is `.vercel/output` (as configured in `astro.config.mjs`).
*   Ensure the deployment environment uses Node.js v18+.

## Available Commands

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Installs dependencies                        |
| `npm run dev`     | Starts local dev server at `localhost:4321`  |
| `npm run build`   | Builds the production site                   |
| `npm run preview` | Previews the production build locally        |

## Learn More

*   [Google Cloud Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
*   [BrightData SERP API Documentation](https://brightdata.com/products/serp-api)
*   [Google AI Gemini Documentation](https://ai.google.dev/docs) (for general Gemini model info)
*   [Astro (Vercel) Documentation](https://docs.astro.build/en/guides/integrations-guide/vercel/)
*   [How I Added llms.txt to My Astro Blog](https://alexop.dev/posts/how-i-added-llms-txt-to-my-astro-blog/) (example of Astro project modification)
