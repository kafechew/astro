# Astro + Permit.io + Gemini: RBAC & AI Q&A Example

This project demonstrates how to implement Role-Based Access Control (RBAC) in an Astro web application using Permit.io, enhanced with AI-powered Q&A functionality using Google Gemini. It features:

1.  A simple blog application where users with different roles have varying levels of access to read, update, and delete blog posts, with permissions dynamically updated based on user selection.
2.  A Q&A interface allowing users to ask questions about specific "documents" (represented by tags), with access controlled by Permit.io policies.

## Features

*   **Dynamic Frontend Permission Checks:** Utilizes Permit.io for RBAC on blog post actions (Edit/Delete).
*   **AI-Powered Q&A:** Integrates Google Gemini 2.5 Pro for answering questions based on document tags.
*   **Permit.io Authorization for AI:** Secures the Q&A feature, ensuring users can only ask questions about documents they are authorized to access.
*   **Dynamic UI Updates:** BlogList permissions (Edit/Delete buttons) and Q&A access dynamically change based on the selected user ID in the UI, reflecting real-time permission checks.
*   **Astro API Routes:** Dedicated API endpoints (`/api/getPermissions.json`, `/api/askQna.json`) handle Permit.io checks and Gemini API interaction.
*   **React Components in Astro:** Uses React components (`BlogList.jsx`, `QnaForm.astro`) within an Astro project.
*   **Environment Variable Management:** Securely handles API keys for Permit.io and Gemini via a `.env` file.

## Why RBAC & Fine-Grained Authorization?

Astro is a modern framework for building fast websites. As applications grow, managing user permissions becomes crucial. While Astro doesn't have built-in RBAC, integrating an authorization layer ensures that authenticated users can only perform actions appropriate for their role.

As applications grow, managing user permissions becomes crucial. Implementing authorization logic from scratch is complex. [Permit.io](https://permit.io/) simplifies this by providing a decoupled authorization layer, allowing you to manage policies, roles, and resources outside your application code. This project extends basic RBAC to demonstrate fine-grained control, even for AI features, ensuring users only access data and functionality appropriate for their roles and permissions.

## Prerequisites

*   **Node.js:** Version 18.x or later (as specified in `package.json`).
*   **Astro Familiarity:** Basic understanding of Astro concepts.
*   **Permit.io Account:** A free [Permit.io](https://app.permit.io/) account.
*   **Google AI / Gemini API Key:** An API key for Google Gemini. You can obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Project Structure

Key files and directories:

```text
/
├── public/
│   └── ... (static assets)
├── src/
│   ├── components/
│   │   ├── BlogList.jsx       # React component displaying blogs, dynamically showing Edit/Delete based on permissions
│   │   └── QnaForm.astro      # Astro component with User ID selector and form for asking Gemini questions
│   ├── layouts/
│   │   └── ... (Astro layouts)
│   ├── pages/
│   │   ├── api/
│   │   │   ├── getPermissions.json.js # API route for checking Blog update/delete permissions
│   │   │   └── askQna.json.js         # API route for checking Q&A permissions & calling Gemini
│   │   ├── blog/              # Markdown files for blog posts
│   │   └── index.astro        # Main page, renders QnaForm and BlogList
│   ├── services/
│   │   └── geminiService.js   # Service module for interacting with the Google Gemini API
│   ├── styles/
│   │   └── global.css
│   ├── utils/
│   │   └── blogs.js           # Sample blog data
│   └── env.d.ts
├── .env                       # (Needs to be created) For storing API keys (Permit.io, Gemini)
├── astro.config.mjs
├── package.json
└── README.md
```

## Permit.io Configuration

Follow these steps in your [Permit.io](https://app.permit.io/) dashboard. Ensure you are working within the `Default Project` and `production` environment (or adjust API keys/config accordingly).

1.  **Create Resources:**
    *   Navigate to `Policy` -> `Resources`.
    *   **Resource 1: Blog**
        *   Click `Create Resource`.
        *   Name: `Blog`
        *   Key: `Blog`
        *   Actions: `read`, `update`, `delete` and `create`
        *   Click `Create Resource`.

2.  **Create Roles:**
    *   Navigate to `Policy` -> `Roles`.
    *   Click `Create Role`.
    *   **Role 1:** Name: `Admin`, Key: `Admin`
    *   **Role 2:** Name: `Editor`, Key: `Editor` (Example role with update but not delete)
    *   **Role 3:** Name: `Viewer`, Key: `Viewer` (Example role with read-only)
    *   *Note: You can define roles as needed. The demo uses `admin` and `basic` in the code, adjust accordingly or create these specific roles.*

3.  **Define Policy (Policy Editor):**
    *   Navigate to `Policy` -> `Policy Editor`.
    *   **For `Blog` Resource:**
        *   `admin` role: Check `create`, `read`, `update`, `delete`.
        *   `Admin` role: Check `read`, `update`, `delete`. (to show keys `admin` and `Admin` are different)
        *   `Editor` role: Check `read`, `update`.
        *   `Viewer` role: Check `read`.
        *   `basic` role: Check none.
        *   *Attribute-Based Access Control (Optional but recommended for Q&A):* You can create more granular policies. For example, allow users with a specific attribute (e.g., `department: finance`) to `ask_question` only on `document` resources that also have a matching attribute (e.g., `tag: financial-report`). This requires defining resource and user attributes in Permit.io.
    *   Click `Publish Changes`.

4.  **Create Tenants:**
    *   Navigate to `Directory` -> `Tenants`.
    *   **Tenant: Blog Tenant**
        *   Click `Create Tenant`.
        *   Name: `Blog Tenant`, Key: `blog-tenant`
        *   Click `Create Tenant`.

5.  **Create Users & Assign Roles:**
    *   Navigate to `Directory` -> `Users`.
    *   Create users corresponding to the IDs used in the `QnaForm.astro` dropdown (e.g., `adminuser`, `admin`, `newuser`).
    *   **Example User (`adminuser`):**
        *   Key: `adminuser`
        *   Assign to `blog-tenant` with role `admin`.
    *   **Example User (`newuser`):**
        *   Key: `newuser`
        *   Assign to `blog-tenant` with role `basic`.
    *   Create other users (`admin`) and assign roles as needed for testing.

## Project Setup

1.  **Clone the Repository (if you haven't):**
    ```bash
    # Example: Assuming the code is in a repo named 'astro-permit-gemini'
    git clone <your-repo-url>
    cd astro-permit-gemini
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    # This installs Astro, React, Permit.io SDK, Google AI SDK, etc.
    ```

3.  **Configure Environment Variables:**
    *   Create a `.env` file in the project root.
    *   **Permit.io API Key:**
        *   Go to [Permit.io Settings -> API Keys](https://app.permit.io/settings/api-keys).
        *   Generate an API Key with appropriate permissions for your project/environment.
        *   Add to `.env`:
            ```env
            PERMIT_TOKEN="<YOUR_PERMIT_API_KEY>"
            ```
    *   **Gemini API Key:**
        *   Obtain a key from [Google AI Studio](https://aistudio.google.com/app/apikey).
        *   Add to `.env`:
            ```env
            GEMINI_API_KEY="<YOUR_GEMINI_API_KEY>"
            ```

## Running the Application

1.  **Start the Dev Server:**
    ```bash
    npm run dev
    ```
2.  **Access:** Navigate to `http://localhost:4321` in your browser.

The application will load, and the `BlogList` component will fetch permissions via the `/api/getPermissions.json` route when you attempt to edit or delete posts.

## How RBAC is Implemented

1.  **Page Load (`index.astro`):**
    *   Renders the `QnaForm.astro` and `BlogList.jsx` components.
    *   `BlogList.jsx` initially fetches permissions for the default user ('adminuser') via `/api/getPermissions.json` and renders Edit/Delete buttons accordingly.

2.  **User Selection (`QnaForm.astro`):**
    *   When the user selects a different User ID from the dropdown, `QnaForm.astro` dispatches a `useridchange` custom event.
    *   A script in `index.astro` listens for this and dispatches a `windowUserIdChange` event on the `window` object.

3.  **Dynamic Blog Permissions (`BlogList.jsx`):**
    *   `BlogList.jsx` listens for the `windowUserIdChange` event.
    *   Upon receiving the event, it updates its internal `currentUserId` state.
    *   A `useEffect` hook, dependent on `currentUserId`, re-fetches permissions for the *new* user from `/api/getPermissions.json`.
    *   The component re-renders, showing/hiding Edit/Delete buttons based on the newly fetched permissions.

4.  **Q&A Interaction (`QnaForm.astro`):**
    *   User enters a Document Tag and Question, then clicks "Ask Question".
    *   Client-side script sends a `POST` request to `/api/askQna.json` with `userId`, `question`, and `documentTag`.

5.  **Q&A Backend (`askQna.json.js`):**
    *   The API route receives the request.
    *   It initializes the Permit client.
    *   It performs `permit.check(userId, 'ask_question', { type: 'document', key: documentTag, tenant: 'qna-tenant' })`.
    *   **If permitted:** It calls the `geminiService.js` to get an answer from the Gemini API using the provided question and tag context. It returns `{ success: true, answer: ... }`.
    *   **If not permitted:** It returns `{ success: false, error: 'Unauthorized' }` (Status 403).
    *   Handles errors (missing keys, API errors) and returns appropriate responses (Status 500).

6.  **Displaying Q&A Response (`QnaForm.astro`):**
    *   The client-side script receives the response from `/api/askQna.json`.
    *   It displays the answer or the "Unauthorized" error message in the response area.

## Demoing Roles and Permissions

1.  **Run the App:** `npm run dev`.
2.  **Open:** `http://localhost:4321`.
3.  **Test Blog Permissions:**
    *   Select `adminuser` (or your `admin` equivalent) in the "User ID" dropdown. Observe that Edit/Delete buttons are visible on the blog posts.
    *   Select `newuser` (or your `basic` equivalent). Observe that Edit/Delete buttons disappear.
    *   Select other users/roles you've configured and verify the button visibility matches your Permit.io policy for the `Blog` resource (`update`/`delete` actions in `blog-tenant`).
4.  **Test Q&A Permissions:**
    *   Select `adminuser` (or a user *with* permission).
    *   Enter a `Document Tag` (e.g., `general-policy`) and a `Question` (e.g., "What is the main point?"). Click "Ask Question". You should receive an answer from Gemini.
    *   Select `newuser` (or a user *without* `ask_question` permission).
    *   Enter the same `Document Tag` and `Question`. Click "Ask Question". You should receive an "Unauthorized" error message.
    *   Test with different document tags if you have configured attribute-based policies in Permit.io.

This demonstrates how Permit.io controls access to both standard CRUD operations (on blogs) and AI-driven features (Q&A), with the UI dynamically reflecting the permissions of the selected user.

## Deployment

This project can be deployed to platforms like Vercel or Netlify.

*   **Adapter:** Uses `@astrojs/vercel/serverless` by default. Change `astro.config.mjs` if deploying elsewhere (e.g., `@astrojs/netlify`).
*   **Environment Variables:** Ensure `PERMIT_TOKEN` and `GEMINI_API_KEY` are configured in your deployment platform's environment variable settings.
*   **Node.js Version:** Ensure the deployment environment uses Node.js 18.x or later.
*   **Root Directory (Vercel):** If your code is in a subdirectory (like the original example), configure the Root Directory setting in Vercel.

### Deployment to Vercel

This project is configured for deployment to Vercel using the `@astrojs/vercel/serverless` adapter.

1.  **Prerequisites:**
    *   Ensure your code is pushed to a GitHub/GitLab/Bitbucket repository.
    *   Sign up for a free [Vercel account](https://vercel.com/signup) and connect it to your Git provider.

2.  **Import Project:**
    *   On your Vercel dashboard, click "Add New..." -> "Project".
    *   Select the repository containing this project.

3.  **Configure Project:**
    *   **Root Directory:** Vercel needs to know the code is in the `astro/` subdirectory. Click "Edit" next to "Root Directory" and set it to `astro`.
    *   **Framework Preset:** Vercel should automatically detect "Astro".
    *   **Build & Output Settings:** These should be detected automatically (Build Command: `npm run build`, Output Directory: `.vercel/output`). You typically don't need to change these.
    *   **Node.js Version:** The required Node.js version ("18.x") is specified in `package.json` and should be used automatically by Vercel.
    *   **Environment Variables:**
        *   Expand the "Environment Variables" section.
        *   Add a variable with the **Name** `PERMIT_TOKEN` and paste your Permit.io API Key into the **Value** field.
        *   Ensure it's available for all environments.

4.  **Deploy:**
    *   Click the "Deploy" button. Vercel will build and deploy your site.

5.  **Access:** Once complete, Vercel will provide the URL for your live deployment.

## Available Commands

| Command           | Action                                         |
| :---------------- | :--------------------------------------------- |
| `npm install`     | Installs dependencies                          |
| `npm run dev`     | Starts local dev server at `localhost:4321`    |
| `npm run build`   | Build your production site                     |
| `npm run preview` | Preview your build locally, before deploying   |

## Learn More

*   [Astro-Framework-RBAC-Example](https://github.com/permitio/Astro-Framework-RBAC-Example)
*   [How to Implement RBAC (Role-Based Access Control) in Astro Framework](https://www.permit.io/blog/how-to-implement-rbac-role-based-access-control-in-astro-framework)
*   [Permit.io Documentation](https://docs.permit.io/)
*   [Google AI Gemini Documentation](https://ai.google.dev/docs)
*   [Astro Documentation](https://docs.astro.build)
*   [Astro Discord Server](https://astro.build/chat)
