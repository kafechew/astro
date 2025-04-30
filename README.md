# Astro + Permit.io RBAC Example: Secure Blog Application

This project demonstrates how to implement Role-Based Access Control (RBAC) in an Astro web application using Permit.io. It features a simple blog application where users with different roles (Admin, Employee) have varying levels of access to read, update, and delete blog posts.

**Note:** This example focuses on the frontend integration. Optionally, it assumes a separate backend service (like the corresponding Meteor example) is running and handling potentially other aspects (AI, database, ...).

## Features

*   Frontend permission checks using Permit.io.
*   Conditionally enabling/disabling actions (Edit/Delete) based on user permissions fetched from an API route.
*   Integration with the Permit.io SDK via a dedicated API endpoint.

## Why RBAC for Astro?

Astro is a modern framework for building fast websites. As applications grow, managing user permissions becomes crucial. While Astro doesn't have built-in RBAC, integrating an authorization layer ensures that authenticated users can only perform actions appropriate for their role.

Implementing authorization logic from scratch is complex and time-consuming. [Permit.io](https://permit.io/) simplifies this by providing a decoupled authorization layer with an intuitive interface to manage policies, roles, and resources outside your application code. This leads to cleaner code, easier management, and consistent access control.

## Prerequisites

*   **Node.js:** Ensure you have Node.js (version recommended by Astro) installed.
*   **Astro Familiarity:** Basic understanding of Astro concepts is helpful.
*   **Permit.io Account:** You'll need a free [Permit.io](https://app.permit.io/) account to configure the authorization policies.

## Project Structure

Key files and directories in this project:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── BlogList.jsx       # React component displaying blogs and handling edit/delete actions with permission checks
│   ├── layouts/
│   │   └── Layout.astro       # Main Astro layout
│   ├── pages/
│   │   ├── api/
│   │   │   └── getPermissions.json.js # API route that uses Permit.io SDK to check permissions
│   │   ├── blog/              # Markdown files for blog posts
│   │   └── index.astro        # Main page, renders BlogList
│   ├── styles/
│   │   └── global.css
│   ├── utils/
│   │   ├── blogs.js           # Sample blog data
│   │   └── user.json          # Sample user data (including key for permission checks)
│   └── env.d.ts
├── .env                       # (Needs to be created) For storing API keys
├── astro.config.mjs
├── package.json
└── README.md
```

## Permit.io Configuration

Follow these steps in your [Permit.io](https://app.permit.io/) dashboard to set up the necessary authorization rules for this demo. Ensure you are working within the `Default Project` and `production` environment.

1.  **Create Resource:**
    *   Navigate to `Policy` -> `Resources`.
    *   Click `Create Resource`.
    *   Name: `Blog`
    *   Key: `Blog`
    *   Actions: `read`, `create`, `update`, `delete`
    *   Click `Create Resource`.

2.  **Create Roles:**
    *   Navigate to `Policy` -> `Roles`.
    *   Click `Create Role`.
    *   Role 1:
        *   Name: `Admin`
        *   Key: `Admin`
        *   Permissions: (Leave blank for now, we'll set in the Policy Editor)
    *   Click `Create Role`.
    *   Role 2:
        *   Name: `Employee`
        *   Key: `Employee`
        *   Permissions: (Leave blank for now)
    *   Click `Create Role`.
    *   *Note: Differentiate these from the default `admin` role if necessary.*

3.  **Define Policy:**
    *   Navigate to `Policy` -> `Policy Editor`.
    *   Configure permissions for the `Blog` resource:
        *   `Admin` role: Check `read`, `create`, `update`, `delete`.
        *   `Employee` role: Check `read`.
    *   Click `Save Changes` or `Publish Changes`.

4.  **Create Tenant:**
    *   Navigate to `Directory` -> `Tenants`.
    *   Click `Create Tenant`.
    *   Name: `blog-tenant`
    *   Key: `blog-tenant` (auto-generated usually)
    *   Description: `A tenant for our blog`
    *   Click `Create Tenant`.

5.  **Create User:**
    *   Navigate to `Directory` -> `Users`.
    *   Click `Create User`.
    *   Key: `demo-user` (or choose your own)
    *   Email: `user@example.com` (use a real or placeholder email)
    *   First Name: `Demo`
    *   Last Name: `User`
    *   Assign the user to the `blog-tenant`.
    *   Assign the **`Employee`** role initially for the demo.
    *   Click `Create User`.

## Project Setup

1.  **Clone the Repository:**
    ```bash
    # If you haven't already, clone the main permit.io examples repo
    git clone https://github.com/hermitonl/astro
    cd astro
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    *   Create a `.env` file in the `astro/` directory.
    *   Go to your [Permit.io Settings -> API Keys](https://app.permit.io/settings/api-keys) and generate a new API Key with `Read` and `Write` permissions for the `Default Project` and `production` environment.
    *   Copy the API Key.
    *   Add the following line to your `.env` file, replacing `<YOUR_PERMIT_API_KEY>` with the key you just copied:
        ```env
        PERMIT_TOKEN="<YOUR_PERMIT_API_KEY>"
        ```

## Running the Application

Start the Astro development server:

```bash
npm run dev
```

Navigate to `http://localhost:4321` in your browser.

The application will load, and the `BlogList` component will fetch permissions via the `/api/getPermissions.json` route when you attempt to edit or delete posts.

## Deployment to Vercel

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
## How RBAC is Implemented

*   **API Route (`src/pages/api/getPermissions.json.js`):** This server-side route uses the Permit SDK (`permit.check()`) to determine the permissions for the currently hardcoded user (`demo-user` within the `blog-tenant`) regarding the `Blog` resource. In a real application, you would replace the hardcoded user key with the identifier of the logged-in user.
*   **Frontend Components (`src/components/BlogList.jsx`):** This React component fetches permissions from the API route. Based on the returned permissions (`read`, `update`, `delete`), it conditionally renders UI elements like "Edit" and "Delete" buttons next to each blog post.

## How RBAC Works Here

1.  The `BlogList.jsx` component renders blog posts with "Edit" and "Delete" buttons.
2.  When a user clicks "Edit" or "Delete", the component calls the `/api/getPermissions.json` API route, passing the `user.key` (from `src/utils/user.json`) and the `operation` ('update' or 'delete').
3.  The `getPermissions.json.js` API route uses the `permitio` SDK and the `PERMIT_TOKEN` to call `permit.check(user, operation, resource)` against the Permit.io PDP.
4.  The API route returns `{ "status": "permitted" }` or `{ "status": "not-permitted" }`.
5.  The `BlogList.jsx` component receives the response. If permitted, it updates the UI state (edits or deletes the post). If not permitted, it does nothing, effectively blocking the action.

## Demoing Roles

This application demonstrates access control based on the user's assigned role in Permit.io.

### 1. Demo Employee Permissions:

*   **Setup:** Ensure the user (`demo-user` or the key you created) is assigned the `Employee` role in the Permit.io dashboard (`Directory` -> `Users` -> Edit User -> Role Assignments).
*   **Run the App:** `npm run dev` and open `http://localhost:4321`.
*   **Observe:** You should see the list of blog posts. However, the "Edit" and "Delete" buttons should **not** be visible, as the `Employee` role only has `read` permission for the `Blog` resource.

### 2. Demo Admin Permissions:

*   **Update Role:** Go to your Permit.io dashboard (`Directory` -> `Users` -> Edit User -> Role Assignments). Change the user's role from `Employee` to `Admin`. Save the changes in Permit.io.
*   **Restart/Refresh App:** You might need to stop (`Ctrl+C`) and restart the dev server (`npm run dev`) or simply refresh the browser page (`http://localhost:4321`) for the permission changes to take effect (as the permissions are fetched on load).
*   **Observe:** You should now see the "Edit" and "Delete" buttons next to each blog post, as the `Admin` role has `read`, `update`, and `delete` permissions. (Note: The actual edit/delete functionality is not implemented in this basic demo, but the UI reflects the permissions).

This demonstrates how you can dynamically control user capabilities in your Astro application by managing roles and policies centrally in Permit.io without changing your application code.

## Available Commands

| Command           | Action                                         |
| :---------------- | :--------------------------------------------- |
| `npm install`     | Installs dependencies                          |
| `npm run dev`     | Starts local dev server at `localhost:4321`    |
| `npm run build`   | Build your production site to `./dist/`        |
| `npm run preview` | Preview your build locally, before deploying   |

## Learn More

*   [Astro-Framework-RBAC-Example](https://github.com/permitio/Astro-Framework-RBAC-Example)
*   [How to Implement RBAC (Role-Based Access Control) in Astro Framework](https://www.permit.io/blog/how-to-implement-rbac-role-based-access-control-in-astro-framework)
*   [Permit.io Documentation](https://docs.permit.io/)
*   [Astro Documentation](https://docs.astro.build)
*   [Astro Discord Server](https://astro.build/chat)
