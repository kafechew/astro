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

This section outlines the Retrieval Augmented Generation (RAG) capabilities integrated into hermitAI, leveraging MongoDB Atlas Vector Search. For a comprehensive and detailed breakdown of the RAG design, including data models, ingestion pipeline specifics, vector search index configuration, and the exact chat integration logic, please refer to the dedicated **[`rag_design_spec.md`](rag_design_spec.md:1)** document.

*   **2.1. Implemented RAG Capabilities Summary:**
    *   **Data Ingestion:** Users can build their private knowledge base through:
        *   File Uploads (PDF, TXT, MD): [`/api/rag/ingest/upload`](src/pages/api/rag/ingest/upload.js:1)
        *   URL Submissions: [`/api/rag/ingest/url`](src/pages/api/rag/ingest/url.js:1)
        *   Direct Text Input: [`/api/rag/ingest/text`](src/pages/api/rag/ingest/text.js:1)
        *   UI for these are available on the user's profile page ([`src/pages/profile.astro`](src/pages/profile.astro:1)).
    *   **Data Processing:** Ingested content is chunked. Embeddings are generated using `@google/generative-ai`'s `models/text-embedding-004` model via `getEmbeddingForQuery(text, "RETRIEVAL_DOCUMENT")` in `src/services/ragService.js`.
    *   **Storage:** Processed data (chunks, 768-dim embeddings) are stored in the `knowledge_documents` collection, scoped by `userId`.
    *   **Hybrid Retrieval and Augmentation (in `src/pages/api/ai/chat.js`):**
        1.  User query is embedded using `getEmbeddingForQuery(query, "RETRIEVAL_QUERY")`.
        2.  `fetchRagContext` from `src/services/ragService.js` performs a vector search against the user's documents using the `$vectorSearch` pipeline (index: `vector_index_knowledge_cosine`, filter by `userId`, projects `score`).
        3.  **Relevance Check:** If the top retrieved document's score meets or exceeds `RELEVANCE_THRESHOLD` (e.g., 0.75):
            *   The retrieved context is used to directly synthesize an answer with the LLM, using a specialized prompt that instructs the LLM to answer *only* from the provided context. The ReAct tool decision is bypassed.
        4.  **Fallback to ReAct:** If no documents are found, or the top score is below the threshold:
            *   The system proceeds with the standard ReAct agent flow, using the original user query to decide if a tool needs to be called.

*   **2.2. Key MongoDB Components:**
    *   **Collection:** `knowledge_documents` (stores text chunks, 768-dim `embedding` from `models/text-embedding-004`, and `userId`).
    *   **Vector Search Index:**
        *   **Manual Creation Required:** An Atlas Search Index named `vector_index_knowledge_cosine` (or as per `VECTOR_SEARCH_INDEX_NAME` env var) must be created on the `knowledge_documents` collection.
        *   **Configuration:**
            *   Index the `embedding` field (Type: `vector`, Dimensions: `768`, Similarity: `cosine`).
            *   Crucially, the `userId` field **must be mapped as type `filter`** in the Atlas Search Index definition to enable filtering in the `$vectorSearch` stage.
        *   Refer to [`rag_design_spec.md`](rag_design_spec.md:1) for more details.

*   **2.3. Detailed Design Document:**
    *   For an in-depth understanding of the RAG architecture, data flow, API specifications, prompt engineering, and specific configurations, please consult the **[`rag_design_spec.md`](rag_design_spec.md:1)** file.

**3. General Considerations**

*   **3.1. Key Node.js Dependencies:**
    *   `mongodb` (official driver)
    *   `bcryptjs` (password hashing)
    *   `jsonwebtoken` (JWT handling)
    *   `@google-cloud/aiplatform` (for Vertex AI LLM, if used)
        *   `@google/generative-ai` (for Gemini embeddings and potentially LLM)
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