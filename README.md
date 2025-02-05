# SocialSage AI

A social-first AI trading analysis platform that helps users make informed trading decisions by analyzing social sentiment and market data.

## Project Structure
```
socialsage-ai/
├── frontend/    # Next.js Frontend Application
├── backend/     # Firebase Functions Backend
```

## Tech Stack
- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: Firebase Functions, Firebase Admin SDK
- AI/ML: AWS Bedrock
- Database: Firebase Firestore
- Authentication: Firebase Auth
- Storage: Firebase Storage

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm/pnpm
- Firebase CLI
- AWS Account (for Bedrock)

### Backend Setup
1. ✅ Initialize Firebase Admin SDK
2. ✅ Set up service account key
3. ✅ Create Firebase Functions:
   - ✅ User Authentication
   - [ ] Market Analysis
   - [ ] Social Integration
4. 🚧 AWS Bedrock Integration:
   - [ ] Set up AWS credentials
   - [ ] Configure Bedrock client

### Frontend Setup
1. ✅ Initialize Next.js project
2. 🚧 Create Core Components:
   - ✅ Authentication hooks
   - [ ] Dashboard
   - [ ] Analysis View
   - [ ] Social Feed
3. ✅ Firebase Client Integration:
   - ✅ Set up Firebase client config
   - ✅ Authentication hooks
   - [ ] Data fetching utilities

## Environment Setup

1. Backend Environment Variables (backend/.env):
```bash
FIREBASE_PROJECT_ID=your-project-id
```

2. Frontend Environment Variables (frontend/.env.local):
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Development

```bash
# Install dependencies
cd frontend && npm install
cd backend && npm install

# Run frontend development server
cd frontend && npm run dev

# Run backend functions locally
cd backend && npm run serve
```

## Next Steps
1. 🚧 Create authentication UI components
2. 🚧 Implement AWS Bedrock integration for market analysis
3. 🚧 Build dashboard UI
4. 🚧 Add social media integration

## Contributing
This is a hackathon project for ETHGlobal Agents. 