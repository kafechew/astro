# Astro + Gemini: AI Q&A Example

This project demonstrates integrating AI-powered Q&A using Google Gemini into an [Astro](https://astro.build/) web application.

It showcases:
1.  **AI-Powered Q&A:** A Q&A interface where users ask Google Gemini questions about specific topics ("documents" identified by tags).

<!-- TODO: Add screenshot of the application UI here -->
## Core Features

*   **Google Gemini Integration:** Provides AI-driven answers based on user questions and document tags.
*   **Dynamic UI:** Frontend components (React `BlogList`, Astro `QnaForm`) provide an interactive experience.
*   **Astro API Routes:** Backend endpoints (e.g., `/api/getPermissions.json`, `/api/askQna.json`) handle application logic and external API calls (Gemini).
*   **Secure API Key Management:** Uses a `.env` file for Gemini API keys.

## Prerequisites

*   Node.js v18.x or later
*   Basic understanding of Astro
*   A [Google AI / Gemini API Key](https://aistudio.google.com/app/apikey)

## Project Structure Highlights

```text
/
├── public/             # Static assets
├── src/
│   ├── components/
│   │   ├── BlogList.jsx       # React: Displays blogs
│   │   ├── Footer.astro       # Astro: Site footer
│   │   ├── Navbar.astro       # Astro: Site navigation
│   │   └── QnaForm.astro      # Astro: Gemini Q&A form
│   ├── pages/
│   │   ├── api/
│   │   │   ├── getPermissions.json.js # API: Handles blog permissions (currently defaults to all allowed)
│   │   │   └── askQna.json.js         # API: Calls Gemini
│   │   ├── blog/              # Blog post markdown files
│   │   └── index.astro        # Main page rendering components
│   ├── services/
│   │   └── geminiService.js   # Module for Gemini API interaction
│   └── utils/
│       └── blogs.js           # Sample blog data
├── .env                   # (Create this) Stores API keys
├── astro.config.mjs       # Astro configuration
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
    *   Add your Google Gemini API Key:
        ```env
        GEMINI_API_KEY="<YOUR_GEMINI_API_KEY>"
        ```

## Running the Application

1.  **Start Development Server:**
    ```bash
    npm run dev
    ```
2.  **Access:** Open `http://localhost:4321` in your browser.

## How It Works: Q&A Flow

1.  **Page Load (`index.astro`):** Renders `QnaForm` and `BlogList`. `BlogList` interacts with blog data; any permission-related logic previously handled by Permit.io is now simplified or uses default states (e.g., via `/api/getPermissions.json` which defaults to all allowed).
2.  **Blog Interaction (`BlogList.jsx`):** Displays blog posts. Edit/Delete functionalities are present, and their availability is now based on the simplified logic from `/api/getPermissions.json` (which defaults to all allowed), rather than dynamic user-based permissions.
3.  **Q&A Request (`QnaForm.astro`):** Submitting the Q&A form sends a `POST` request to `/api/askQna.json` with the `question` and `documentTag`.
4.  **Q&A Backend Processing (`askQna.json.js`):**
    *   The API route receives the request.
    *   It calls `geminiService.js` (passing the `question` and `documentTag` for context).
    *   It returns the AI's answer.
5.  **Display Result (`QnaForm.astro`):** Shows the Gemini answer.

## Deployment

This project is configured for Vercel serverless deployment (`@astrojs/vercel/serverless`). Adapt `astro.config.mjs` for other platforms (e.g., Netlify).

**Key Deployment Steps:**

*   Push code to a Git provider (GitHub, GitLab, etc.).
*   Import the project into your hosting platform (e.g., Vercel).
*   **Configure Environment Variables:** Set `GEMINI_API_KEY` in your platform's settings.
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

*   [Google AI Gemini Documentation](https://ai.google.dev/docs)
*   [Astro (Vercel) Documentation](https://docs.astro.build/en/guides/integrations-guide/vercel/)
*   [How I Added llms.txt to My Astro Blog](https://alexop.dev/posts/how-i-added-llms-txt-to-my-astro-blog/)
