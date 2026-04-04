# PantryPulse Architecture

PantryPulse is a full-stack, AI-powered grocery management application built with React, Firebase, and Google's Gemini AI.

## Technical Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS for responsive, utility-first design
- **Animations**: Framer Motion for smooth UI transitions
- **Backend/Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Authentication (Google OAuth)
- **AI Integration**: Google Gemini API (`@google/genai`)
- **Icons**: Lucide React

## System Components

### 1. Frontend Layer (React)
- **App.tsx**: The central orchestrator managing application state, authentication flow, and routing between tabs (Inventory, Add, Shopping, Settings).
- **Components**:
    - `GroceryForm`: Handles manual entry and AI-powered scanning (Product & Invoice).
    - `InventoryList`: Displays current stock with freshness indicators and predictive restocking logic.
    - `ShoppingList`: Manages items to buy, integrated with price comparison (simulated/grounded).
    - `InvoiceReviewModal`: A specialized UI for reviewing and editing AI-extracted data from receipts.

### 2. Service Layer
- **firebase.ts**: Initializes Firebase SDK and exports Firestore/Auth instances.
- **geminiService.ts**: Encapsulates all calls to the Gemini API, including:
    - `analyzeProductImage`: Identifies single products from photos.
    - `analyzeInvoiceImage`: Extracts structured data (items, prices, dates) from receipts.
    - `getRestockPredictions`: (Conceptual) Uses AI to suggest items based on household size and preferences.

### 3. Data Layer (Firestore)
- **inventory**: Stores current grocery items linked to `uid`.
- **shoppingList**: Stores items planned for purchase.
- **households**: Stores household metadata (members, preferences) for personalized AI suggestions.

## Data Flow: Invoice Scanning
1. User captures/uploads an invoice image in `GroceryForm`.
2. `analyzeInvoiceImage` sends the base64 image to Gemini 3 Flash.
3. Gemini returns a structured JSON object containing extracted items and purchase date.
4. `InvoiceReviewModal` displays this data for user verification.
5. Upon confirmation, `App.tsx` performs a batch write to the `inventory` collection.

## Security
- **Firestore Rules**: Implements granular access control ensuring users can only read/write their own data (`request.auth.uid == resource.data.uid`).
- **Validation**: Helper functions in security rules validate data types, string lengths, and required fields.
