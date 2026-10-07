# AI Business Intelligence & Analytics Automation Platform

An intelligent, modern, agentic BI and analytics platform designed to automate document parsing, schema mapping, interactive visual styling, database relationships detection, forecasting, and data intelligence insights.

---

## 🚀 Project Status: Phase 3.5 Completed & Working (Unified Ingestion Architecture)

This project has successfully completed the implementation of **Phase 3.5**, including critical architectural refactoring for unified datasets and processing persistence:
- **Phase 1: Foundation, Authentication & Project Setup** (Completed)
- **Phase 2: Document Ingestion & Version Control** (Completed)
- **Phase 3: Dataset Intelligence & Ingestion Pipelines** (Completed)
- **Phase 3.5: Multi-Dataset Combined Ingestions, Unified Processing Artifacts, Custom Dashboards & Analytics Exporters** (Completed & Working)

### Phase 3.5 Refactoring Highlights:
* **Unified Ingestion Engine**: Downstream analytics components (Dashboards, KPIs, Visualizations, Exporters, and Reports) now consume from the exact same immutable **Processing Artifact** (`ProcessingArtifact`) instead of reconstructing merges or loading files dynamically.
* **Mongoose RefPath Schemas**: Support dynamic references to either `Dataset` or `CombinedDataset` collections using Mongoose `refPath` for seamless polymorphism.
* **GridFS Merged Storage**: Relational merged files are cached as CSV streams inside GridFS and shared across all export and ingestion modules.
* **Authentication Fix**: Addressed token fetching logic inside service layer classes to resolve 401 Unauthorized errors on CSV/Excel file downloads.

---

## 🛠️ Project Architecture

The system is separated into:
1. **client**: React Single Page Application utilizing Vite, Tailwind CSS, TanStack Query, Framer Motion, and Firebase Auth Client.
2. **server**: Node.js Express server utilizing TypeScript, Mongoose (MongoDB Atlas), Firebase Admin SDK, JWT session handling, and advanced KPI visualization builders.

---

## 📂 Directory Structure

```
IRP project/
├── client/              # React SPA frontend
│   ├── src/
│   │   ├── components/  # Reusable UI widgets
│   │   ├── context/     # Auth Context (session tokens)
│   │   ├── pages/       # Datasets, Dashboards, Combined Managers
│   │   └── services/    # Axios clients & endpoint hooks
│   └── .env.example     # Client-side configuration template
├── server/              # Node.js TypeScript API backend
│   ├── src/
│   │   ├── config/      # DB and cloud integrations
│   │   ├── controllers/ # Business logic routing handlers
│   │   ├── services/    # Join engine, KPI metrics generators
│   │   └── models/      # Mongoose schemas
│   └── .env.example     # Server-side configuration template
├── serviceAccountKey.json.example  # Firebase credentials template
└── .gitignore           # Global git exclusion definitions (Excludes sensitive credential files)
```

---

## 🔧 Setup & Running Guide

To run this application locally, you and your collaborators must initialize the configuration templates.

### 1. Credentials Configuration

Duplicate the configuration templates and fill in your credential values:

* **Firebase Credentials**:
  ```bash
  # Duplicate the credentials template at the root directory
  cp serviceAccountKey.json.example serviceAccountKey.json
  ```
  Fill in your Firebase Admin SDK service account variables.

* **Server Environment**:
  ```bash
  cd server
  cp .env.example .env
  ```
  Edit `server/.env` to configure your MongoDB connection string, JWT secrets, Gemini API key, Cloudinary account details, and Mailtrap parameters.

* **Client Environment**:
  ```bash
  cd ../client
  cp .env.example .env
  ```
  Edit `client/.env` with your client-side Firebase API keys.

---

### 2. How to Run

#### Backend Server
```bash
cd server
npm install
npm run build
npm run dev
```

#### Frontend Client
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.
