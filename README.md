# hermitAI

**hermitAI** is like ChatGPT on steroids — your personal AI twin for autonomous research, real-time web scraping, intelligent Q&A and soon email, social, bill management & more. It’s designed to help hermits (and high-performers) live a focused, hands-off digital life. Built with Google’s Gemini 2.5 via Vertex AI, BrightData APIs, and Astro, hermitAI is your privacy-conscious AI agent — lightweight, powerful, and ready to grow.

## What Is It?

hermitAI is a developer-friendly, self-hostable AI agent that combines:

- **LLM intelligence** (Gemini 2.5 via Vertex AI),
- **Real-time web scraping** (via BrightData),
- **Private knowledge retrieval** (MongoDB vector db),
- **Modern UI** (Astro, JSX),
- and soon: **Email, social, bill management & more.**

It’s built for hackers, researchers, solopreneurs, and digital hermits seeking a streamlined, AI-augmented life.

## Philosophy

**hermitAI** is for people who want to offload tedious digital tasks while maintaining sovereignty over their data and tools. It’s not just an AI assistant — it’s an infrastructure for your quiet, high-functioning, tech-augmented life.

## Core Features

*   **Google Vertex AI (Gemini model) Integration:** Utilizes Google's powerful Gemini model through Vertex AI for sophisticated language understanding and generation.
*   **Live Data Access via BrightData APIs:** Enables the chatbot to fetch real-time information from the web (SERP API), scrape web content (Request API), and access structured datasets (Datasets API) to answer queries, ensuring responses are current and comprehensive.
*   **Retrieval Augmented Generation (RAG) with RAG-Aware Tool Decision:** Users can build a private knowledge base. The AI uses this via MongoDB Atlas Vector Search.
    *   `chat.js` fetches RAG context. If highly relevant (based on score vs. `RELEVANCE_THRESHOLD`), this context string (`ragContextForReAct`) is passed to `executeInProcessReActLoop` in `reactProcessorService.js`.
    *   `reactProcessorService.js` incorporates `ragContextForReAct` (if provided) into the `firstPassPrompt` for tool decision. This allows the LLM to intelligently choose `tool_name: 'none'` if the RAG context is sufficient, or select a tool if it's not.
    *   Synthesis paths vary: strict RAG synthesis if 'none' was chosen due to RAG context, tool-based synthesis if a tool was run, or general knowledge synthesis if 'none' was chosen without RAG context. Full details in [`rag_design_spec.md`](rag_design_spec.md:1).
*   **Dynamic UI:** Interactive chat at `/ai` ([`src/components/ChatInterface.astro`](src/components/ChatInterface.astro:1)). RAG ingestion forms on user profile ([`src/pages/profile.astro`](src/pages/profile.astro:1)).
*   **Astro API Routes:** [`/api/ai/chat.js`](src/pages/api/ai/chat.js:1) orchestrates AI, RAG, credits, and tools. RAG ingestion APIs under `src/pages/api/rag/ingest/`.
*   **Secure API Key Management:** Uses `.env` for `GEMINI_API_KEY` (for `@google/generative-ai` embeddings), Google Cloud credentials (for Vertex AI chat), `MONGODB_URI`, `JWT_SECRET`, SMTP vars, `APP_BASE_URL`, `VECTOR_SEARCH_INDEX_NAME`, `RAG_RELEVANCE_THRESHOLD`.
*   **Planned Browser Automation:** Upcoming capability for advanced browser automation to handle interactive web tasks.
*   **User Authentication:** Secure user registration, login, and session management using MongoDB and JWTs.
*   **Email Verification:** System for verifying user email addresses via token-based email links, including a resend option.
*   **User Profiles:** Basic user profile viewing and updating capabilities, including access to RAG document ingestion forms.
*   **Credit System for AI Queries:** Users receive 5 credits upon email verification. Each AI query costs 1 credit. The Navbar and Profile page display credits, with the Navbar updating immediately after a query via a special HTTP header.

## AI Chat Interface

The main interface lives at `/ai`, built using Astro’s component model. The backend orchestration happens through:

- [`/api/ai/chat.js`](src/pages/api/ai/chat.js:1) — Core logic for routing prompts to Gemini and invoking tools.
- [`ChatInterface.astro`](src/components/ChatInterface.astro:1) — Clean, interactive UI for chatting.

## Available Chatbot Tools

The AI chatbot can leverage the following tools via BrightData's direct APIs to enhance its responses:

| Tool                                     | Description                                                                 | Prompt Example                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `search_engine`                          | Live Google search (SERP API).                                              | "What's the weather in Tokyo?"                                              |
| `scrape_as_markdown`                     | Scrapes a URL and returns Markdown.                                         | "Summarize the article at https://example.com/article"                      |
| `scrape_as_html`                         | Scrapes raw HTML of a URL.                                                  | "Get the HTML for example.com"                                              |
| `web_data_linkedin_person_profile`       | Structured LinkedIn person profile data.                                    | "Info on LinkedIn profile https://www.linkedin.com/in/johndoe"              |
| `web_data_amazon_product`                | Structured Amazon product data (requires URL with /dp/).                    | "Details for Amazon product https://www.amazon.com/dp/ASIN123"              |
| `web_data_amazon_product_reviews`        | Structured Amazon product reviews (requires URL with /dp/).                 | "Reviews for Amazon product https://www.amazon.com/dp/ASIN123"              |
| `web_data_linkedin_company_profile`    | Structured LinkedIn company profile data.                                   | "Data for LinkedIn company https://www.linkedin.com/company/example"        |
| `web_data_zoominfo_company_profile`    | Structured ZoomInfo company profile data.                                   | "ZoomInfo details for https://www.zoominfo.com/c/example/123"             |
| `web_data_instagram_profiles`            | Structured Instagram profile data.                                          | "Get Instagram profile data for instagram.com/exampleuser"                  |
| `web_data_instagram_posts`               | Structured Instagram post data from a profile or post URL.                  | "Latest posts from instagram.com/exampleuser"                               |
| `web_data_instagram_reels`               | Structured Instagram reel data from a profile or reel URL.                  | "Fetch reels from instagram.com/exampleuser"                                |
| `web_data_instagram_comments`            | Structured Instagram comments for a specific post/reel URL.                 | "Comments for Instagram post https://www.instagram.com/p/POSTID"            |
| `web_data_facebook_posts`                | Structured Facebook post data.                                              | "Data for Facebook post https://www.facebook.com/user/posts/POSTID"       |
| `web_data_facebook_marketplace_listings` | Structured Facebook Marketplace listing data.                               | "Details for FB Marketplace item https://www.facebook.com/marketplace/item/ITEMID" |
| `web_data_zillow_properties_listing`     | Structured Zillow property listing data (requires URL with /homedetails/). | "Zillow listing info for https://www.zillow.com/homedetails/ADDRESS/ID"   |
| `web_data_booking_hotel_listings`        | Structured Booking.com hotel listing data (requires URL with /hotel/).      | "Booking.com hotel details for https://www.booking.com/hotel/country/name.html" |
| `web_data_youtube_videos`                | Structured YouTube video data. (Uses placeholder BrightData `dataset_id` - needs verification) | "Info on YouTube video https://www.youtube.com/watch?v=VIDEOID"         |
| `session_stats`                          | Lists available tools (simplified version).                                 | "What are my session stats?"                                                |

## Future Tools / Roadmap (from BrightData MCP)

The following additional tools are available in the BrightData MCP client and could be integrated into this chatbot in the future, pending identification of their direct API equivalents and implementation:

| Feature                               | Description                                                                                                |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `web_data_amazon_product_search`      | Quickly read structured amazon product search data.                                                        |
| `web_data_walmart_product`            | Quickly read structured walmart product data.                                                              |
| `web_data_walmart_seller`             | Quickly read structured walmart seller data.                                                               |
| `web_data_ebay_product`               | Quickly read structured ebay product data.                                                                 |
| `web_data_homedepot_products`         | Quickly read structured homedepot product data.                                                            |
| `web_data_zara_products`              | Quickly read structured zara product data.                                                                 |
| `web_data_etsy_products`              | Quickly read structured etsy product data.                                                                 |
| `web_data_bestbuy_products`           | Quickly read structured bestbuy product data.                                                              |
| `web_data_linkedin_job_listings`      | Quickly read structured linkedin job listings data.                                                        |
| `web_data_linkedin_posts`             | Quickly read structured linkedin posts data.                                                               |
| `web_data_linkedin_people_search`     | Quickly read structured linkedin people search data.                                                       |
| `web_data_crunchbase_company`         | Quickly read structured crunchbase company data.                                                           |
| `web_data_facebook_company_reviews`   | Quickly read structured Facebook company reviews data.                                                     |
| `web_data_facebook_events`            | Quickly read structured Facebook events data.                                                              |
| `web_data_tiktok_profiles`            | Quickly read structured Tiktok profiles data.                                                              |
| `web_data_tiktok_posts`               | Quickly read structured Tiktok post data.                                                                  |
| `web_data_tiktok_shop`                | Quickly read structured Tiktok shop product data.                                                          |
| `web_data_tiktok_comments`            | Quickly read structured Tiktok comments data.                                                              |
| `web_data_google_maps_reviews`        | Quickly read structured Google maps reviews data.                                                          |
| `web_data_google_shopping`            | Quickly read structured Google shopping data.                                                              |
| `web_data_google_play_store`          | Quickly read structured Google play store data.                                                            |
| `web_data_apple_app_store`            | Quickly read structured apple app store data.                                                              |
| `web_data_reuter_news`                | Quickly read structured reuter news data.                                                                  |
| `web_data_github_repository_file`     | Quickly read structured github repository data.                                                            |
| `web_data_yahoo_finance_business`     | Quickly read structured yahoo finance business data.                                                       |
| `web_data_x_posts`                    | Quickly read structured X post data.                                                                       |
| `web_data_youtube_profiles`           | Quickly read structured youtube profiles data.                                                             |
| `web_data_youtube_comments`           | Quickly read structured youtube comments data.                                                             |
| `web_data_reddit_posts`               | Quickly read structured reddit posts data.                                                                 |
| `scraping_browser_*` tools            | Tools for browser automation (e.g., navigate, click, type). Full implementation and usage of these tools rely on the external Node.js Agent Service being set up and configured via the `NODE_AGENT_SERVICE_URL` environment variable. This service would host the BrightData MCP client capable of running these browser interactions. *(See [`plan-browser-tools.md`](plan-browser-tools.md:1) for an example architecture of such an external service)* |

*Note: Integration of most other tools would depend on the availability and nature of their corresponding direct BrightData APIs or alternative invocation methods suitable for a serverless environment.*

## How It Works: AI Chat Flow (`/ai` page)

The AI chat functionality, orchestrated by [`/api/ai/chat.js`](src/pages/api/ai/chat.js:1) and [`src/services/reactProcessorService.js`](src/services/reactProcessorService.js:1), follows this sophisticated RAG-aware ReAct flow:

1.  **Authentication & Credit Checks (`chat.js` via `chatPreChecksService.js`):**
    *   User sends a message.
    *   System verifies authentication, email status, and credit balance (>= 1).
    *   If checks pass, 1 credit is deducted.

2.  **RAG Attempt (`chat.js` via `ragService.js`):**
    *   `originalUserQuery` is embedded.
    *   `fetchRagContext` performs a vector search (MongoDB Atlas, `vector_index_knowledge_cosine` index, filtered by `userId`) to get `ragDocuments` and their scores.

3.  **Relevance Check & Context Preparation (`chat.js`):**
    *   `chat.js` checks if the top `ragDocument`'s score meets or exceeds `RELEVANCE_THRESHOLD` (e.g., 0.75).
    *   If highly relevant, `ragContextForReAct` (the string of RAG context) is prepared. Otherwise, `ragContextForReAct` is `null`.

4.  **Invoke ReAct Loop (`chat.js` calls `reactProcessorService.js`):**
    *   `executeInProcessReActLoop(originalUserQuery, ragContextForReAct, context)` is called.
    *   `ragContextForReAct` is either the RAG context string or `null`.

5.  **RAG-Aware Tool Decision (`reactProcessorService.js`):**
    *   A `firstPassPrompt` is constructed.
    *   **Crucially, if `ragContextForReAct` was provided, it's included in this `firstPassPrompt`**. This allows the LLM to consider the knowledge base context *before* deciding on a tool.
    *   The LLM responds with a JSON object: `{ "tool_name": "chosen_tool_or_none", "arguments": { ... } }`.

6.  **Conditional Execution & Synthesis (`reactProcessorService.js`):**
    *   **A. If `tool_name` is a specific tool:**
        *   The tool is executed.
        *   The final answer is synthesized using `originalUserQuery` and the `toolOutput`.
    *   **B. If `tool_name` is 'none':**
        *   **B1. If `ragContextForReAct` was provided (and thus considered by LLM for the 'none' decision):**
            *   A strict RAG synthesis prompt is used, combining `originalUserQuery` and `ragContextForReAct`. The LLM answers *only* from this context.
        *   **B2. If `ragContextForReAct` was `null` (no RAG context or not relevant enough for the 'none' decision):**
            *   A general knowledge synthesis prompt is used with `originalUserQuery`. The LLM answers based on its general training.

7.  **Streaming Response & Credit Update:**
    *   The final synthesized answer is streamed to [`ChatInterface.astro`](src/components/ChatInterface.astro:1).
    *   The response includes an `X-User-Credits` header with the new credit balance.

This flow intelligently integrates RAG into the ReAct agent's decision-making process, prioritizing verified knowledge when available and relevant, while still allowing for tool use or general knowledge responses otherwise. Full prompt details are in [`rag_design_spec.md`](rag_design_spec.md:1).

## Project Structure Highlights

```text
/
├── public/                  # Static assets
├── src/
│   ├── components/
│   │   ├── ChatInterface.astro  # Astro: Interactive chat interface for the /ai page.
│   │   ├── BlogList.jsx         # React: Displays blogs (potentially less central if Q&A is deprecated)
│   │   ├── Footer.astro         # Astro: Site footer
│   │   ├── Navbar.astro         # Astro: Site navigation, displays user credits.
│   │   └── QnaForm.astro        # Astro: Original Gemini Q&A form (role might be reduced or deprecated in favor of /ai)
│   ├── layouts/                 # Astro layouts (MainLayout.astro, BlogPostLayout.astro etc.)
│   ├── pages/
│   │   ├── ai.astro             # Astro: Main AI chat page with ChatInterface.astro.
│   │   ├── index.astro          # Main page (original landing, /ai is the new chat focus)
│   │   ├── login.astro          # Frontend page for user login.
│   │   ├── register.astro       # Frontend page for user registration.
│   │   ├── profile.astro        # Frontend page for user profile, displays user credits, and hosts RAG ingestion forms.
│   │   ├── blog/                # Blog post markdown files
│   │   └── api/
│   │       ├── ai/
│   │       │   └── chat.js      # API: Orchestrates AI responses, RAG, credit checks/deduction, tool decisions, BrightData APIs.
│   │       ├── auth/            # Directory for authentication API endpoints.
│   │       │   ├── login.js       # Handles user login.
│   │       │   ├── me.js          # Fetches current user data.
│   │       │   ├── register.js    # Handles user registration.
│   │       │   ├── profile.js     # Handles profile updates.
│   │       │   ├── verify-email.js # Verifies email and allocates initial credits.
│   │       │   └── resend-verification-email.js # Resends verification email.
│   │       ├── rag/
│   │       │   └── ingest/        # Directory for RAG data ingestion APIs:
│   │       │       ├── upload.js  # API for file-based RAG ingestion.
│   │       │       ├── url.js     # API for URL-based RAG ingestion.
│   │       │       └── text.js    # API for text-based RAG ingestion.
│   │       ├── askQna.json.js   # API: Original Q&A endpoint (superseded by /api/ai/chat.js)
│   │       └── getPermissions.json.js # API: Handles blog permissions (review for removal)
│   ├── services/
│   │   ├── vertexAiService.js   # Module for Vertex AI (Gemini chat model) interaction.
│   │   ├── ragService.js        # Module for RAG embedding generation (@google/generative-ai) and context retrieval.
│   │   ├── chatPreChecksService.js # Module for auth, email verification, and credit checks.
│   │   ├── reactProcessorService.js # Module for managing the ReAct agent loop, tool execution, and associated prompting.
│   │   └── geminiService.js     # Potentially for other Gemini direct API uses (e.g. embeddings if not in ragService, though ragService currently handles this).
│   ├── lib/
│   │   ├── mongodb.js           # MongoDB connection utility.
│   │   ├── emailService.js      # Service for sending emails.
│   │   └── ai-tools/            # Directory for individual BrightData tool execution functions.
│   ├── middleware.js          # Astro middleware for JWT authentication and session management.
│   └── utils/
│       └── blogs.js             # Sample blog data
│   ├── components/
│   │   └── Auth/              # Directory for authentication UI components (RegisterForm, LoginForm).
├── mongo.md                   # Design document for MongoDB integration, including RAG and credit system details.
├── rag_design_spec.md         # Detailed design document for the RAG implementation.
├── BrowserAutomationService/    # (Separate Project - Planned for Render.com)
├── .env                       # (Create this) Stores API keys for Vertex AI, BrightData, etc.
├── astro.config.mjs           # Astro configuration
├── package.json
└── README.md
```

## Prerequisites

*   Node.js v18.x or later
*   Basic understanding of Astro
*   Google Cloud Project with Vertex AI enabled.
*   Service account credentials (JSON key file or individual environment variables) for Vertex AI.
*   BrightData account and SERP API credentials (API Token, Zone).
*   A [Google AI / Gemini API Key](https://aistudio.google.com/app/apikey) (if `geminiService.js` is retained for other purposes or as a fallback).
*   MongoDB Atlas account and connection URI.
*   SMTP server access (host, port, user, password) for email verification.
*   **Crucially for RAG:** Ability to create a Vector Search Index in your MongoDB Atlas cluster.

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
    *   Add your API keys and configuration.
            ```env
            # Google Gemini API Key (Required for RAG Embeddings via @google/generative-ai)
            GEMINI_API_KEY="<YOUR_GOOGLE_AI_GEMINI_API_KEY>"
    
            # Google Vertex AI Credentials (Required for LLM chat model, if using Vertex AI)
            # Option 1: Service Account Key JSON path
            # GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-file.json"
            # Option 2: Individual credentials
            GOOGLE_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
            GOOGLE_CLIENT_EMAIL="<YOUR_GCP_SERVICE_ACCOUNT_EMAIL>"
            GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_KEY_PART_1\\nYOUR_KEY_PART_2\\n-----END PRIVATE KEY-----\\n"
    
            # BrightData Credentials (Required for web scraping tools)
            BRIGHTDATA_API_TOKEN="<YOUR_BRIGHTDATA_API_TOKEN>"
            BRIGHTDATA_WEB_UNLOCKER_ZONE="<YOUR_BRIGHTDATA_ZONE>" # Or relevant SERP zone
    
            # Node.js Agent & Tool Service URL (Optional, for advanced external tool integrations)
            # NODE_AGENT_SERVICE_URL="<URL_OF_THE_EXTERNAL_NODE_JS_AGENT_SERVICE>"
    
            # MongoDB Configuration (Required for User Management and RAG)
            MONGODB_URI="mongodb+srv://<user>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority"
            # Name of your Atlas Vector Search Index. Must match the index created in Atlas.
            # See mongo.md and rag_design_spec.md for details on index configuration.
            VECTOR_SEARCH_INDEX_NAME="vector_index_knowledge_cosine"

            # RAG Configuration
            # Defines the minimum vector search score for a document to be considered highly relevant
            # and trigger the direct RAG synthesis flow, bypassing ReAct tool decision.
            RAG_RELEVANCE_THRESHOLD="0.75" # Threshold for forcing RAG context (0.0 to 1.0)
    
            # JWT Configuration (Required for Authentication)
            JWT_SECRET="<YOUR_VERY_STRONG_JWT_SECRET_KEY>"
    
            # SMTP Email Configuration (Required for Email Verification)
            SMTP_HOST="<YOUR_SMTP_HOST>"
            SMTP_PORT="587" # Or your SMTP port
            SMTP_USER="<YOUR_SMTP_USERNAME>"
            SMTP_PASSWORD="<YOUR_SMTP_PASSWORD>"
            SMTP_FROM_EMAIL="<YOUR_SENDER_EMAIL_ADDRESS>"
    
            # Application Base URL (Required for Email Verification Links)
            APP_BASE_URL="http://localhost:4321" # Or your production URL
        ```

4.  **Create MongoDB Atlas Vector Search Index (CRITICAL FOR RAG):**
    *   For RAG to work, **manually create a Vector Search Index** in MongoDB Atlas for the `knowledge_documents` collection.
        *   **Index Name:** Use the value from `VECTOR_SEARCH_INDEX_NAME` (default: `vector_index_knowledge_cosine`).
        *   **Atlas Search Index Definition (JSON editor):**
            ```json
            {
              "mappings": {
                "dynamic": true,
                "fields": {
                  "embedding": {
                    "type": "vector",
                    "dimensions": 768,
                    "similarity": "cosine"
                  },
                  "userId": {
                    "type": "string",
                    "analyzer": "keyword", // Important for exact matches
                    "indexOptions": "docs",
                    "norms": "omit",
                    // Crucially, ensure it's available for filtering.
                    // In newer Atlas UIs, you might define this as a 'filter' type field directly
                    // or ensure it's indexed appropriately to be used in the $vectorSearch 'filter' stage.
                    // The key is that `userId` must be queryable as a filter.
                    // A simple string index with keyword analyzer usually works.
                    // For Atlas Search UI: Add `userId` as a field, type `Token` (which becomes `string` with `keyword` analyzer).
                    // Or, more directly if available: map `userId` as type `filter`.
                  }
                }
              }
            }
            ```
        *   **Field Mappings:**
            *   `embedding`: Type `vector`, `768` dimensions (for `models/text-embedding-004`), `cosine` similarity.
            *   `userId`: **Crucially, ensure `userId` is mapped as type `filter` or an equivalent (e.g., `string` with `keyword` analyzer) that allows it to be used in the `$vectorSearch` stage's `filter` option.** This is vital for data isolation.
        *   Refer to MongoDB Atlas documentation and [`rag_design_spec.md`](rag_design_spec.md:1) for more details.

    *   **External Node.js Agent & Tool Service (e.g., on Render.com) - Key Environment Variables (If you deploy it):**
        If you set up the external service, it will typically require its own set of environment variables, including:
        ```env
        # For the external service itself:
        GOOGLE_PROJECT_ID="<YOUR_GCP_PROJECT_ID>"
        GOOGLE_CLIENT_EMAIL="<YOUR_GCP_SERVICE_ACCOUNT_EMAIL>"
        GOOGLE_PRIVATE_KEY="<YOUR_GCP_PRIVATE_KEY_FORMATTED>"
        BRIGHTDATA_API_TOKEN="<YOUR_BRIGHTDATA_API_TOKEN>"
        BRIGHTDATA_WEB_UNLOCKER_ZONE="<YOUR_BRIGHTDATA_ZONE>"
        # Potentially other BrightData credentials for MCP browser tools if used by the service:
        # BRIGHTDATA_BROWSER_AUTH="<YOUR_BRIGHTDATA_BROWSER_AUTH_CREDENTIALS>" # e.g., brd-customer-ACCOUNT-zone-ZONE
        PORT="3000" # Or any port the service platform assigns
        ```
        *The Astro application (hermitAI) only needs `NODE_AGENT_SERVICE_URL` to communicate with this external service. The other Google and BrightData keys listed for the Astro app are used for its fallback in-process ReAct loop.*

## Running the Application

1.  **Start Development Server:**
    ```bash
    npm run dev
    ```
2.  **Access:** Open `http://localhost:4321` in your browser.

## Deployment Architecture

The project supports a flexible deployment model:

1.  **Astro Application (Vercel - Core):**
    *   **Hosts:** The frontend UI ([`src/pages/ai.astro`](src/pages/ai.astro:1), [`src/components/ChatInterface.astro`](src/components/ChatInterface.astro:1)), the main AI chat API ([`/api/ai/chat.js`](src/pages/api/ai/chat.js:1)).
    *   **Functionality:**
        *   If `NODE_AGENT_SERVICE_URL` is **not** set, it directly orchestrates calls to Gemini (Vertex AI) and uses a subset of BrightData tools via their direct APIs (in-process ReAct loop).
        *   If `NODE_AGENT_SERVICE_URL` **is** set, it proxies requests to the external Node.js Agent & Tool Service.
    *   **Platform:** Typically deployed on Vercel (configured via [`astro.config.mjs`](astro.config.mjs:1)).
    *   **Key Environment Variables (for Vercel deployment):**
        *   `GOOGLE_PROJECT_ID`
        *   `GOOGLE_CLIENT_EMAIL`
        *   `GOOGLE_PRIVATE_KEY`
        *   `BRIGHTDATA_API_TOKEN`
        *   `BRIGHTDATA_WEB_UNLOCKER_ZONE`
        *   `NODE_AGENT_SERVICE_URL` (Optional: URL of the external Node.js Agent & Tool Service)
        *   `GEMINI_API_KEY` (if still applicable for other uses)

2.  **Node.js Agent & Tool Service (Render.com - Optional, Advanced):**
    *   **Hosts:** A separate Node.js service that implements advanced agentic logic, full BrightData MCP integration (including browser tools like `scraping_browser_*`), and potentially other backend tasks.
    *   **Functionality:** Receives requests proxied from the Astro application (when `NODE_AGENT_SERVICE_URL` is set).
    *   **Platform:** Can be deployed on platforms like Render.com, Heroku, or any environment that can run a persistent Node.js server.
    *   **Key Environment Variables (for this separate service):**
        *   Its own `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`.
        *   Its own `BRIGHTDATA_API_TOKEN`, `BRIGHTDATA_WEB_UNLOCKER_ZONE`.
        *   Potentially `BRIGHTDATA_BROWSER_AUTH` if using BrightData's browser automation features.
        *   `PORT` (e.g., `3000`, or as assigned by the platform).
    *   **Details:** The setup of this service is independent of the core Astro application. The Astro app only needs the `NODE_AGENT_SERVICE_URL` to connect to it. Refer to [`plan-browser-tools.md`](plan-browser-tools.md:1) for an example architecture of such a service focused on browser tools.

The Vercel Astro app can function independently using its in-process ReAct loop for a core set of tools if `NODE_AGENT_SERVICE_URL` is not provided. The external service enhances its capabilities.

### Vercel Deployment Steps (Astro Application):

*   Push code to a Git provider (GitHub, GitLab, etc.).
*   Import the project into Vercel.
*   **Configure Environment Variables on Vercel:** Set the variables listed above for the Astro Application. Ensure multi-line values like `GOOGLE_PRIVATE_KEY` are handled correctly.
*   **Build Settings:**
    *   Build Command: `npm run build`
    *   Output Directory: `.vercel/output` (as per `astro.config.mjs`)
*   Ensure the Vercel deployment environment uses Node.js v18+.

## Learn More

*   [Google Cloud Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
*   [BrightData SERP API Documentation](https://brightdata.com/products/serp-api)
*   [Google AI Gemini Documentation](https://ai.google.dev/docs) (for general Gemini model info)
*   [Astro (Vercel) Documentation](https://docs.astro.build/en/guides/integrations-guide/vercel/)
*   [How I Added llms.txt to My Astro Blog](https://alexop.dev/posts/how-i-added-llms-txt-to-my-astro-blog/) (example of Astro project modification)
