# High-Level Design: MongoDB Atlas Integration for hermitAI

This document outlines the high-level design for integrating MongoDB Atlas into the `hermitAI` application, covering User Management and Retrieval Augmented Generation (RAG) with MongoDB Atlas Vector Search.

**1. User Management**

*   **1.1. User Data Model (MongoDB Collection: `users`)**
    *   `_id`: `ObjectId`
    *   `username`: `String` (unique, indexed)
    *   `email`: `String` (unique, indexed)
    *   `passwordHash`: `String` (hashed using bcrypt)
    *   `profile`: `Object` (`displayName`, `avatarUrl`, `bio`)
    *   `createdAt`: `Date`
    *   `updatedAt`: `Date`
    *   `roles`: `Array` of `String` (e.g., `["user", "admin"]`)
    *   `lastLoginAt`: `Date` (optional)
    *   `preferences`: `Object` (optional, e.g., `theme`, `defaultKnowledgeBaseId`)
    *   `isEmailVerified`: `Boolean` (default `false`)
    *   `emailVerificationToken`: `String` (nullable)
    *   `emailVerificationTokenExpires`: `Date` (nullable)
    *   `credits`: `Number` (default: 0, stores the user's AI query credits)

*   **1.2. Authentication/Authorization Strategy**
    *   **Authentication:** JWT (JSON Web Tokens) stored in HTTP-only cookies.
    *   **Authorization:** Role-Based Access Control (RBAC) using the `roles` field. Astro middleware will verify JWTs and roles.

*   **1.3. New API Endpoints (Astro, under `/api/auth/`)**
    *   `POST /register`: User registration.
    *   `POST /login`: User login, issues JWT.
    *   `POST /logout`: Clears JWT cookie.
    *   `GET /me` (Protected): Returns current user's profile.
    *   `PUT /profile` (Protected): Updates user profile/preferences.
    *   `GET /verify-email?token=<token>`: Verifies the email using the provided token.
    *   `POST /resend-verification-email` (Protected): Allows a logged-in, unverified user to request a new verification email.
    *   (Optional Future) `POST /forgot-password`, `POST /reset-password`.

*   **1.4. Frontend Integration**
    *   **New Components:** `RegisterForm.astro`, `LoginForm.astro`, `ProfilePage.astro` (under `src/components/Auth/`).
    *   **Modifications:** `src/components/ChatInterface.astro` to display auth state and links.
    *   **New Pages:** `/login`, `/register`, `/profile`.
    *   **State Management:** Client-side store for auth state.

*   **1.5. Credit System for AI Queries**
    *   **1.5.1. User Data Model (`users` collection extension)**
        *   The `users` collection (detailed in 1.1) is extended with:
            *   `credits`: `Number` - Stores the available AI query credits for the user. Defaults to 0.
    *   **1.5.2. Credit Allocation**
        *   Upon successful email verification (via `GET /api/auth/verify-email`), users are allocated an initial 5 credits.
    *   **1.5.3. Credit Deduction (in `src/pages/api/ai/chat.js`)**
        *   **Pre-requisite:** User's email must be verified (`isEmailVerified: true`).
        *   **Cost:** Each AI query to `src/pages/api/ai/chat.js` costs 1 credit.
        *   **Process:**
            1.  Before processing the AI query, the system checks if the user is email verified and has sufficient credits (>= 1).
            2.  If checks pass, 1 credit is atomically deducted from the user's `credits` field in the database.
            3.  After successful deduction, the system fetches the fresh (updated) credit balance.
            4.  This updated balance is sent back to the client in the `X-User-Credits` HTTP header with the AI response stream.
    *   **1.5.4. Error Handling (in `src/pages/api/ai/chat.js`)**
        *   If email is not verified: API returns a `403 Forbidden` error with a message like "Email not verified. Please verify your email to use AI features."
        *   If insufficient credits: API returns a `402 Payment Required` error with a message like "Insufficient credits. You need at least 1 credit to make an AI query."
    *   **1.5.5. API Endpoint Modifications for Credit System**
        *   `src/pages/api/auth/verify-email.js`:
            *   Modified to grant 5 initial credits to the user upon successful email verification if they don't have any credits yet.
        *   `src/pages/api/ai/chat.js`:
            *   Modified to implement credit check, deduction, and sending the `X-User-Credits` header.
            *   Handles errors for unverified email and insufficient credits.
        *   `src/pages/api/auth/login.js` & `src/pages/api/auth/me.js`:
            *   Modified to include the `credits` field in the user object returned to the client.
        *   `src/middleware.js`:
            *   Ensures user data (including credits) fetched by `me.js` is available for server-rendered components if needed, though primary updates are client-side or via API responses.
    *   **1.5.6. UI/UX Changes for Credit System**
        *   **Credit Display:**
            *   [`src/components/Navbar.astro`](src/components/Navbar.astro:1): Displays the user's current credit balance.
            *   [`src/pages/profile.astro`](src/pages/profile.astro:1): Displays the user's current credit balance.
        *   **Client-Side Credit Update:**
            *   [`src/components/ChatInterface.astro`](src/components/ChatInterface.astro:1):
                *   Listens for the `X-User-Credits` header in responses from `src/pages/api/ai/chat.js`.
                *   Upon receiving the header, it updates a client-side store or directly manipulates the DOM to reflect the new credit balance in the Navbar immediately, without requiring a page reload.
        *   **Chat Interface Error Handling:**
            *   [`src/components/ChatInterface.astro`](src/components/ChatInterface.astro:1): Modified to handle and display new API errors related to email verification and insufficient credits.

**2. RAG with MongoDB Atlas Vector Search**

*   **2.1. Data Model (MongoDB Collection: `knowledge_documents`)**
    *   `_id`: `ObjectId`
    *   `userId`: `ObjectId` (indexed, scopes documents to a user)
    *   `sourceUrl`: `String` (optional)
    *   `sourceType`: `String` (e.g., "pdf", "webpage", "text_input")
    *   `originalFilename`: `String` (optional)
    *   `title`: `String` (optional)
    *   `content`: `String` (raw text content or chunk)
    *   `chunkId`: `String` (optional, for multi-chunk documents)
    *   `embedding`: `Array` of `Float` (vector embedding of `content`, indexed for vector search)
    *   `metadata`: `Object` (e.g., page numbers, source document ID)
    *   `createdAt`: `Date`
    *   `updatedAt`: `Date`

*   **2.2. Data Ingestion Pipeline**
    1.  **Source Input:** User uploads (PDF, TXT, MD), web content (via BrightData), direct text.
    2.  **Preprocessing:** Text extraction (e.g., `pdf-parse`), HTML cleaning, document chunking.
    3.  **Embedding Generation:** Use Vertex AI Embeddings API (e.g., `textembedding-gecko`) for consistency.
    4.  **Storage:** Store text chunk, embedding, `userId`, and metadata in `knowledge_documents`.
    5.  **Vector Index:** Create a Vector Search Index in MongoDB Atlas on the `embedding` field (e.g., HNSW or IVF, cosine similarity).
    *   **New API Endpoints (Astro, under `/api/rag/ingest/`, Protected):**
        *   `POST /upload`: Handles file uploads.
        *   `POST /url`: Handles URL submissions for scraping.
        *   `POST /text`: Handles direct text input.

*   **2.3. Vector Search Query Integration into `src/pages/api/ai/chat.js`**
    1.  **Embed User Query:** Convert the incoming user query to an embedding.
    2.  **Vector Search:** Before the main LLM call, perform a `$vectorSearch` on `knowledge_documents` using the query embedding and `userId` to find relevant text chunks.
    3.  **Context Augmentation:** Concatenate retrieved chunks into a context string.
    4.  **Modified LLM Prompt:** Include the retrieved context in the prompt to Gemini, instructing it to use this context.
    5.  **LLM Response:** Gemini generates a response informed by private knowledge. The rest of the ReAct loop proceeds.

**3. General Considerations**

*   **3.1. Key Node.js Dependencies:**
    *   `mongodb` (official driver)
    *   `bcryptjs` (password hashing)
    *   `jsonwebtoken` (JWT handling)
    *   `@google-cloud/aiplatform` (for Vertex AI Embeddings)
    *   `pdf-parse` (PDF text extraction)
    *   `nodemailer` (for sending emails)

*   **3.2. MongoDB Atlas Free-Tier (M0 Cluster) Limitations:**
    *   **Storage:** 512 MB (significant for RAG).
    *   **RAM:** Shared.
    *   **Vector Search:** Supported on M0, but performance/limits might apply.
    *   **Recommendation:** Suitable for personal use/prototyping; communicate limits for broader use.

*   **3.3. Affected/New Files and Directories:**
    *   **Modified:** `src/pages/api/ai/chat.js`, `src/components/ChatInterface.astro`, `.env`, `package.json`, `README.md`.
    *   **New:**
        *   `src/lib/mongodb.js` (or `src/services/mongoService.js`)
        *   `src/pages/api/auth/` (for auth endpoints like `register.js`, `login.js`)
        *   `src/pages/api/rag/ingest/` (for RAG ingestion endpoints)
        *   `src/components/Auth/` (for `RegisterForm.astro`, `LoginForm.astro`)
        *   `src/components/RAG/` (for `DocumentUploadForm.astro`)
        *   New pages: `/login.astro`, `/register.astro`, `/profile.astro`
        *   Astro middleware for auth (`src/middleware.js`).
    *   **3.4. SMTP Configuration:**
        *   For email verification and other email-related features to work, the following SMTP server details must be configured as environment variables:
            *   `SMTP_HOST`: Hostname of the SMTP server.
            *   `SMTP_PORT`: Port number for the SMTP server.
            *   `SMTP_USER`: Username for SMTP authentication.
            *   `SMTP_PASSWORD`: Password for SMTP authentication.
            *   `SMTP_FROM_EMAIL`: The "From" email address for outgoing emails.
            *   `APP_BASE_URL`: The base URL of the application (e.g., `http://localhost:4321` or `https://yourapp.com`), used for constructing verification links.

**4. Diagrams**

*   **User Authentication Flow:**
    \`\`\`mermaid
    sequenceDiagram
        participant Client as Browser/ChatInterface
        participant AstroFE as Astro Frontend Components
        participant AstroAPI as Astro API (/api/auth/*)
        participant MongoDB as MongoDB Atlas (users collection)

        Client->>AstroFE: User enters credentials (login/register)
        AstroFE->>AstroAPI: POST /api/auth/login or /register with credentials
        AstroAPI->>MongoDB: Query user / Create user
        MongoDB-->>AstroAPI: User data / Success
        AstroAPI->>AstroAPI: Generate JWT
        AstroAPI-->>Client: Set HTTP-only JWT cookie & return user profile/success
        Client->>AstroFE: Update UI (logged in state)

        Client->>AstroAPI: Request protected resource (e.g., /api/auth/me or /api/ai/chat with RAG)
        Note over AstroAPI: Middleware verifies JWT
        AstroAPI->>MongoDB: Fetch user-specific data if needed
        MongoDB-->>AstroAPI: Data
        AstroAPI-->>Client: Protected data / Chat response
    end
    \`\`\`

*   **RAG Data Ingestion Flow:**
    \`\`\`mermaid
    graph TD
        A[User Uploads File / Submits URL / Enters Text] --> B(Astro Frontend: RAG UI);
        B --> C{Astro API: /api/rag/ingest/*};
        C --> D[1. Preprocessing: Text Extraction, Cleaning, Chunking];
        D --> E[2. Embedding Generation: Vertex AI Embeddings API];
        E --> F[3. Storage: MongoDB Atlas];
        F --> G(knowledge_documents collection with text & embedding);
        G --> H(MongoDB: Vector Index on 'embedding' field);
    end
    \`\`\`

*   **RAG Query Augmentation Flow (in `src/pages/api/ai/chat.js`):**
    \`\`\`mermaid
    sequenceDiagram
        participant User as User via ChatInterface
        participant ChatJS as /api/ai/chat.js
        participant VertexEmbed as Vertex AI Embeddings
        participant MongoDBVS as MongoDB (Vector Search)
        participant VertexLLM as Vertex AI (Gemini LLM)

        User->>ChatJS: Sends query
        ChatJS->>VertexEmbed: Embed user query
        VertexEmbed-->>ChatJS: Query embedding
        ChatJS->>MongoDBVS: $vectorSearch with query embedding + userId
        MongoDBVS-->>ChatJS: Top N relevant text chunks
        ChatJS->>ChatJS: Augment LLM prompt with retrieved chunks
        ChatJS->>VertexLLM: Send augmented prompt + original query
        VertexLLM-->>ChatJS: LLM response (aware of private context)
        ChatJS-->>User: Stream final response
    end
    \`\`\`