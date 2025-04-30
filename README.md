# Astro + Permit.io RBAC Example

This project demonstrates how to implement Role-Based Access Control (RBAC) in an Astro frontend application using Permit.io. It showcases how to check permissions before allowing users to perform actions like updating or deleting blog posts.

**Note:** This example focuses on the frontend integration. Optionally, it assumes a separate backend service (like the corresponding Meteor example) is running and handling potentially other aspects (AI, database, ...).

## Features

*   Frontend permission checks using Permit.io.
*   Conditionally enabling/disabling actions (Edit/Delete) based on user permissions fetched from an API route.
*   Integration with the Permit.io SDK via a dedicated API endpoint.

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

## Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/hermitonl/astro
    cd /astro
    ```
2.  **Install dependencies:**
    ```sh
    npm install
    ```
3.  **Create Environment File:**
    Create a `.env` file in the `astro/` directory and add your Permit.io API Key:
    ```env
    PERMIT_TOKEN=your_permit_api_key_here
    ```
    Replace `your_permit_api_key_here` with your actual Permit.io environment API key.

4.  **Ensure Backend is Running:**
    Optionally, this frontend might need a backend service (like the Meteor example) to be running, typically on `http://localhost:3000`.

## Running the Development Server

1.  **Start the Astro dev server:**
    ```sh
    npm run dev
    ```
2.  **Open your browser:**
    Navigate to `http://localhost:4321`.

The application will load, and the `BlogList` component will fetch permissions via the `/api/getPermissions.json` route when you attempt to edit or delete posts.

## How RBAC Works Here

1.  The `BlogList.jsx` component renders blog posts with "Edit" and "Delete" buttons.
2.  When a user clicks "Edit" or "Delete", the component calls the `/api/getPermissions.json` API route, passing the `user.key` (from `src/utils/user.json`) and the `operation` ('update' or 'delete').
3.  The `getPermissions.json.js` API route uses the `permitio` SDK and the `PERMIT_TOKEN` to call `permit.check(user, operation, resource)` against the Permit.io PDP.
4.  The API route returns `{ "status": "permitted" }` or `{ "status": "not-permitted" }`.
5.  The `BlogList.jsx` component receives the response. If permitted, it updates the UI state (edits or deletes the post). If not permitted, it does nothing, effectively blocking the action.

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
