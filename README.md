# Astro + Permit.io + Gemini: RBAC & AI Q&A Example

This project demonstrates integrating Role-Based Access Control (RBAC) using [Permit.io](https://permit.io/) and AI-powered Q&A using Google Gemini into an [Astro](https://astro.build/) web application.

It showcases:
1.  **Dynamic RBAC:** A blog where user permissions (Edit/Delete posts) change dynamically based on the selected user and their assigned role via Permit.io.
2.  **AI-Powered Q&A with Authorization:** A Q&A interface where users ask Google Gemini questions about specific topics ("documents" identified by tags), with access controlled by Permit.io policies.

## Core Features

*   **Permit.io RBAC:** Manages user permissions for blog actions (update, delete) and Q&A access (`ask`).
*   **Google Gemini Integration:** Provides AI-driven answers based on user questions and document tags.
*   **Dynamic UI:** Frontend components (React `BlogList`, Astro `QnaForm`) reactively update based on the selected user's permissions fetched from Permit.io via Astro API routes.
*   **Astro API Routes:** Backend endpoints (`/api/getPermissions.json`, `/api/askQna.json`) handle authorization checks and external API calls (Permit.io, Gemini).
*   **Secure API Key Management:** Uses a `.env` file for Permit.io and Gemini API keys.

## Why Permit.io for Authorization?

Managing user permissions directly within an application becomes complex as it scales. Permit.io provides a decoupled authorization layer, simplifying policy management (roles, resources, permissions) outside your core application logic. This example demonstrates how to secure both standard CRUD operations and AI features effectively.

## Key Concepts (Permit.io)

*   **Resource:** An entity you want to protect (e.g., `Blog`, `Document`). Actions (`read`, `update`, `delete`, `ask`) are defined on resources.
*   **Role:** A collection of permissions (e.g., `admin`, `editor`, `basic`, `qna`).
*   **Policy:** Rules defining which roles have which permissions on specific resources.
*   **Tenant:** A grouping mechanism, often representing a customer or organization (e.g., `blog-tenant`).
*   **User:** An individual interacting with the application, assigned roles within tenants.

## Prerequisites

*   Node.js v18.x or later
*   Basic understanding of Astro
*   A free [Permit.io Account](https://app.permit.io/)
*   A [Google AI / Gemini API Key](https://aistudio.google.com/app/apikey)

## Project Structure Highlights

```text
/
├── public/             # Static assets
├── src/
│   ├── components/
│   │   ├── BlogList.jsx       # React: Displays blogs, shows Edit/Delete based on permissions
│   │   └── QnaForm.astro      # Astro: User selector & Gemini Q&A form
│   ├── pages/
│   │   ├── api/
│   │   │   ├── getPermissions.json.js # API: Checks Blog permissions via Permit.io
│   │   │   └── askQna.json.js         # API: Checks Q&A permissions & calls Gemini
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

3.  **Configure Permit.io:**
    *   Log in to your [Permit.io Dashboard](https://app.permit.io/).
    *   **Resources:** Create a `Blog` resource with actions: `read`, `update`, `delete`, `create`, `ask`. 
    *   **Roles:** Create roles like `admin`, `editor`, `basic`, `qna`.
    *   **Policy:** Define permissions in the Policy Editor.
        *   *Blog Resource:* Grant `admin` all actions, `editor` `read`/`update`/`delete`, `basic` `read`.
        *   *Document Resource:* Grant `admin` and `qna` the `ask` action. (You can add more granular rules based on attributes if needed).
    *   **Tenant:** Create a tenant (e.g., `blog-tenant`).
    *   **Users:** Create users (e.g., `admin`, `editor`, `newuser`, `canaskonly`) and assign them roles within the tenant. Match user keys to those in `src/components/QnaForm.astro`.
    *   **Publish Changes.**
    *   *(Refer to [Permit.io Docs](https://docs.permit.io/) for detailed setup guidance)*

4.  **Configure Environment Variables:**
    *   Create a `.env` file in the project root.
    *   Add your Permit.io SDK API Key (Settings -> API Keys):
        ```env
        PERMIT_TOKEN="<YOUR_PERMIT_API_KEY>"
        ```
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

## How It Works: Authorization Flow

1.  **Page Load (`index.astro`):** Renders `QnaForm` and `BlogList`. `BlogList` fetches initial permissions for the default user via `/api/getPermissions.json`.
2.  **User Selection (`QnaForm.astro`):** Changing the user in the dropdown triggers events.
3.  **Dynamic Blog Permissions (`BlogList.jsx`):** Listens for user changes, re-fetches permissions for the *new* user from `/api/getPermissions.json`, and updates the UI (shows/hides Edit/Delete buttons).
4.  **Q&A Request (`QnaForm.astro`):** Submitting the Q&A form sends a `POST` request to `/api/askQna.json` with `userId`, `question`, and `documentTag`.
5.  **Q&A Backend Check (`askQna.json.js`):**
    *   API route receives the request.
    *   Calls `permit.check(userId, 'ask', { type: 'Blog', key: documentTag, tenant: 'blog-tenant' })`.
    *   **If Permitted:** Calls `geminiService.js` (passing the `question` and `documentTag` for context) and returns the AI's answer.
    *   **If Denied:** Returns an "Unauthorized" error (403).
6.  **Display Result (`QnaForm.astro`):** Shows the Gemini answer or the authorization error.

## Demoing Permissions

1.  Run the app (`npm run dev`).
2.  Open `http://localhost:4321`.
3.  **Blog:** Select different users (`adminuser`, `editoruser`, `basicuser`) and observe how the Edit/Delete buttons appear/disappear based on their assigned `Blog` permissions in Permit.io.
4.  **Q&A:**
    *   Select a user *with* `ask` permission (e.g., `admin`, `canaskonly`). Enter a `Document Tag` (e.g., `bitcoin`, `hermit`, `brain`) and `Question`. You should get an AI answer.
    *   Select a user *without* permission (e.g., `newuser`, `editor`). Ask the same question. You should get an "Unauthorized" error.

## Deployment

This project is configured for Vercel serverless deployment (`@astrojs/vercel/serverless`). Adapt `astro.config.mjs` for other platforms (e.g., Netlify).

**Key Deployment Steps:**

*   Push code to a Git provider (GitHub, GitLab, etc.).
*   Import the project into your hosting platform (e.g., Vercel).
*   **Configure Environment Variables:** Set `PERMIT_TOKEN` and `GEMINI_API_KEY` in your platform's settings.
*   **Root Directory (if needed):** If your project is in a subdirectory, configure the Root Directory setting on your platform (Build Command: `npm run build`, Output Directory: `.vercel/output`).
*   Ensure the deployment environment uses Node.js v18+.

## Available Commands

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Installs dependencies                        |
| `npm run dev`     | Starts local dev server at `localhost:4321`  |
| `npm run build`   | Builds the production site                   |
| `npm run preview` | Previews the production build locally        |

## Learn More

*   [Permit.io Documentation](https://docs.permit.io/)
*   [Google AI Gemini Documentation](https://ai.google.dev/docs)
*   [Astro (Vercel) Documentation](https://docs.astro.build/en/guides/integrations-guide/vercel/)
*   [How I Added llms.txt to My Astro Blog](https://alexop.dev/posts/how-i-added-llms-txt-to-my-astro-blog/)
*   [How to Implement RBAC (Role-Based Access Control) in Astro Framework](https://www.permit.io/blog/how-to-implement-rbac-role-based-access-control-in-astro-framework)
*   [Permit.io Astro RBAC Example Repo](https://github.com/permitio/Astro-Framework-RBAC-Example)
*   [Authorization Policy Showdown: RBAC vs. ABAC vs. ReBAC](https://www.permit.io/blog/rbac-vs-abac-vs-rebac)
