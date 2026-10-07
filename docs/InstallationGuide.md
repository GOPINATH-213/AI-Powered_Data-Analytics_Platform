# Installation & Developer Guide — Phase 1

This guide details steps to install, configure, and execute the AI Business Intelligence & Analytics Automation Platform locally.

## Prerequisites
* **Node.js**: `v20.0.0` or higher (verified on `v22.14.0`)
* **NPM**: `v10.0.0` or higher
* **MongoDB**: A running local MongoDB instance or a MongoDB Atlas connection string.

---

## 1. Backend Setup & Run

1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Create your `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Configure your variables. If you don't have Firebase variables configured, the server will automatically detect this and switch to **Developer Auth Fallback Mode**.
4. Run in development mode:
   ```bash
   npm run dev
   ```
   The backend will connect to MongoDB and start listening on port `5000`.

---

## 2. Frontend Setup & Run

1. Navigate to the client folder:
   ```bash
   cd client
   ```
2. Create your `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Configure `VITE_FIREBASE_*` credentials. If left empty, the client UI detects this and offers a simple click-to-bypass panel allowing login as **Admin**, **Analyst**, or **Standard User** for easy debugging!
4. Run in development mode:
   ```bash
   npm run dev
   ```
   The frontend will spin up Vite on `http://localhost:3000`.

---

## 3. Developer Bypass Authentication Mode
To allow full evaluation of the application without configuring external accounts:
1. When signing in, if Firebase configuration is missing, the login screen will show **Developer Bypass Active**.
2. Click any of the role buttons (e.g. **Admin**, **Analyst**).
3. The client will synthesize a bypass token (`dev-token-<email>-<name>`) and send it to the server.
4. The backend will parse this bypass token, create a corresponding user record in your local MongoDB, and sign a standard JWT token, giving you full access to the Dashboard pages.
