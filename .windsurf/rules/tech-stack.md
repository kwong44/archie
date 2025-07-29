---
trigger: always_on
description:
globs:
---
## 2. Core Architectural Principles

*   **BaaS First:** All standard backend operations (database CRUD, authentication, file storage) **MUST** be handled by the Supabase client directly from the frontend. This simplifies the architecture and leverages Supabase's robust, real-time capabilities.
*   **Isolate AI Logic:** The custom Python backend serves **ONLY** as a secure gateway to external AI APIs. It **MUST NOT** contain any business logic related to CRUD operations or user management. This keeps the service lightweight, secure, and focused.
*   **TypeScript Everywhere:** The entire frontend codebase **MUST** be written in TypeScript to ensure type safety, improve code quality, and enhance developer experience.
*   **Environment Variables:** All sensitive keys (Supabase public/anon key, AI backend URL, etc.) **MUST** be managed through environment variables (`.env` files) and exposed via `expo-constants`. **DO NOT** hardcode keys in the source code.

---

## 3. Frontend

*   **Framework:** React Native
*   **Platform / Toolkit:** Expo (Managed Workflow)
    *   **Rule:** Utilize the latest Expo SDK. All native functionality should be sourced from the Expo SDK or officially compatible libraries first before considering custom native modules.
*   **Language:** TypeScript
*   **State Management:** Zustand
    *   **Rationale:** Chosen for its simplicity, minimal boilerplate, and hook-based API that fits well with React's functional paradigm.
    *   **Rule:** Create separate, atomic stores for different domains of state (e.g., `useAuthStore`, `useJournalStore`). Avoid creating a single monolithic store.
*   **Styling:** `react-native-unistyles`
    *   **Rationale:** Provides type-safe, responsive styles with a simple API that supports themes and media queries out of the box.
    *   **Rule:** Define all stylesheets in colocated `styles.ts` files to keep component-related code organized and maintainable.
*   **Navigation:** Expo Router (File-Based)
    *   **Rationale:** As the official routing solution for Expo, it offers a simple, convention-over-configuration approach to defining navigation structures.

---

## 4. Backend as a Service (BaaS)

*   **Provider:** Supabase
*   **Client Library:** `@supabase/supabase-js`
*   **Features Used:**
    *   **Database:** PostgreSQL (Primary data store).
    *   **Authentication:** Handles all user identity (email/password, social logins via Google/Apple).
    *   **Storage:** For user-uploaded content (e.g., audio mantras).
*   **Rule:** The Supabase client **MUST** be initialized once in a central file (`lib/supabase.ts`) and imported throughout the app. This singleton pattern ensures consistent configuration and state.

#### Example: Supabase Client Initialization (`lib/supabase.ts`)
```typescript
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey

// Custom secure storage adapter for Expo
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

---

## 5. Specialized AI Backend

*   **Role:** Securely proxying requests to third-party AI APIs (ElevenLabs, Google Gemini)
*   **Implementation (NEW):** Supabase **Edge Functions** written in **TypeScript**  
    * `transcribe-audio` – Handles Speech-to-Text via ElevenLabs  
    * `generate-summary` – Generates AI reflections via Gemini
*   **Runtime:** Supabase Edge Runtime (Deno)
*   **Hosting:** Runs on Supabase's global edge network – **no more Google Cloud Run**
*   **Authentication:** Edge Functions automatically validate Supabase JWT tokens – no custom middleware required.

> **Legacy Note:** The previous Python/FastAPI microservice on Google Cloud Run has been deprecated. Keep it around only for temporary rollback until Edge Functions are fully verified.

---

## 6. Backend Logging

To ensure observability and effective debugging, the AI backend **MUST** use structured logging. While Winston is a standard for Node.js, the Python equivalent is to use the built-in `logging` module configured with a `JSONFormatter`.

*   **Library:** Python `logging` module.
*   **Format:** All logs should be emitted as a single-line JSON object.
*   **Rule:** Create a central logging utility to configure and provide a logger instance to the rest of the application. This ensures all logs are consistent in structure.

#### Example: Structured Logger Configuration (`logger.py`)

```python
import logging
import json
from pythonjsonlogger import jsonlogger

# 1. Get the logger instance
logger = logging.getLogger("archie-ai-backend")
logger.setLevel(logging.INFO)

# 2. Create a handler to output to console
logHandler = logging.StreamHandler()

# 3. Create a JSON formatter and add it to the handler
# Standard fields added to all log messages
formatter = jsonlogger.JsonFormatter(
    '%(asctime)s %(name)s %(levelname)s %(message)s'
)
logHandler.setFormatter(formatter)

# 4. Add the handler to the logger
# Avoid adding handlers multiple times in a serverless environment
if not logger.handlers:
    logger.addHandler(logHandler)

```

#### Example: Using the Logger in a FastAPI route

```python
# In main.py or another route file
from .logger import logger

@app.post("/api/generate")
async def generate(request: Request, token: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    user_payload = verify_jwt(token.credentials)
    user_id = user_payload.get("sub")

    logger.info(
        "Generate endpoint called by user", 
        extra={'user_id': user_id, 'request_id': request.headers.get('x-request-id')}
    )

    try:
        # ... your business logic ...
        logger.info("Successfully generated content for user", extra={'user_id': user_id})
        return {"status": "success"}
    except Exception as e:
        logger.error(
            "An error occurred in the generate endpoint",
            extra={'user_id': user_id, 'error': str(e)},
            exc_info=True # Adds stack trace
        )
        raise HTTPException(status_code=500, detail="Internal Server Error")

```

---

## 7. Third-Party Services & DevOps

*   **AI Services:**
    *   **ElevenLabs:** Primary provider for Speech-to-Text (STT) and Text-to-Speech (TTS) capabilities
        *   **STT Model:** `scribe_v1` for batch audio transcription
        *   **TTS Model:** `scribe_v1` for AI follow-up voice synthesis
        *   **Rule:** All ElevenLabs API calls **MUST** be routed through the Python backend for security
        *   **Authentication:** API key stored as environment variable `ELEVENLABS_API_KEY`
    *   **Google Gemini API:** For AI-powered text processing and summarization
        *   **Rule:** Continue using for journal entry processing and lexicon reframing
*   **Payments:** RevenueCat (for managing in-app subscriptions).
*   **Push Notifications:** Firebase Cloud Messaging (FCM) (via Expo's `expo-notifications` library).
*   **CI/CD:** GitHub Actions (for automating tests, linting, and deployments).

---

## 8. ElevenLabs Integration Architecture

Following our **Isolate AI** principle, ElevenLabs integration is handled exclusively through the Python backend:

### 8.1 Speech-to-Text Flow
1. **Frontend:** Records audio using `expo-av` (≤60s limit for ElevenLabs)
2. **Backend:** Receives audio file via `/api/speech/transcribe` endpoint
3. **ElevenLabs:** Processes batch STT using `eleven.speech_to_text.convert()`
4. **Response:** Returns transcript with confidence score to frontend

### 8.2 Text-to-Speech Flow (Phase 2)
1. **Frontend:** Sends AI-generated follow-up text to `/api/speech/synthesize`
2. **Backend:** Uses ElevenLabs TTS to generate audio
3. **Response:** Returns base64-encoded MP3 audio for playback
4. **Playback:** Frontend uses `expo-av` to play synthesized audio

### 8.3 Environment Configuration
```python
# Required environment variables for ElevenLabs integration
ELEVENLABS_API_KEY=your_eleven_labs_api_key_here

# Backend configuration in main.py
from elevenlabs import ElevenLabs
eleven = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))
```

### 8.4 Security & Performance Rules
*   **Authentication:** All ElevenLabs endpoints **MUST** validate Supabase JWT tokens
*   **Rate Limiting:** Implement appropriate rate limiting for audio processing endpoints
*   **Audio Limits:** Enforce 60-second maximum audio duration (ElevenLabs constraint)
*   **Error Handling:** Provide graceful fallbacks for API failures
*   **Logging:** Log all ElevenLabs API interactions with user context and performance metrics
