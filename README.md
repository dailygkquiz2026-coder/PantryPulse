# PantryPulse 🍎

PantryPulse is your intelligent kitchen companion that helps you track what you have, what you need, and what's about to expire. Using Google's Gemini AI, it turns a simple photo of a receipt or a product into an organized digital inventory.

## Features

- **📸 AI Scanning**: Scan individual products or entire grocery invoices to update your inventory instantly.
- **📅 Freshness Tracking**: Visual indicators (Red/Amber) for items that are expired or expiring soon.
- **🔮 Predictive Restocking**: Smart suggestions on what to buy next based on your household's usage patterns.
- **🛒 Smart Shopping List**: Keep track of what you need and compare prices across platforms.
- **☁️ Cloud Sync**: Securely store your data with Firebase and access it from any device.
- **📱 Mobile Ready**: Fully responsive design optimized for testing on your phone.

## Getting Started

1. **Login**: Sign in with your Google account.
2. **Scan**: Use the "Scan Invoice" button after a grocery run to log everything at once.
3. **Monitor**: Check your Inventory tab for freshness alerts.
4. **Shop**: Add items to your Shopping List as you run out.

## Tech Stack

- **React** + **Vite**
- **Tailwind CSS**
- **Firebase** (Auth & Firestore)
- **Google Gemini AI**
- **Framer Motion**

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Environment Variables

The following environment variables are required:
- `GEMINI_API_KEY`: Your Google AI Studio API key.
- Firebase configuration (handled via `firebase-applet-config.json`).
