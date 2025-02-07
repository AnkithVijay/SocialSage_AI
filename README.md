# SocialSage AI - Autonomous Trading Agent System

A social-first AI trading analysis platform with autonomous agents that help users make informed trading decisions by analyzing social sentiment and market data.

## Project Structure
```
socialsage-ai/
├── frontend/    # Next.js Frontend Application
├── backend/     # Firebase Functions Backend
└── agent/       # Autonomous Agent System
```

## Architecture

The system consists of several key components:

1. **Scout Module**: Monitors various data sources for potential opportunities
   - Twitter sentiment analysis
   - DeFi protocol APY tracking
   - On-chain activity monitoring

2. **AI Judge**: Evaluates opportunities and makes spawning decisions
   - Risk assessment
   - Capital requirement analysis
   - Success probability prediction

3. **Agent Factory**: Creates and deploys new agent instances
   - Deterministic wallet generation
   - Docker container deployment
   - Initial capital allocation

4. **Health Monitor**: Manages agent lifecycle
   - Performance tracking
   - Auto-termination conditions
   - Audit trail maintenance

## Tech Stack
- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: Firebase Functions, Firebase Admin SDK
- AI/ML: AWS Bedrock, OpenAI
- Database: Firebase Firestore
- Authentication: Firebase Auth
- Storage: Firebase Storage
- Blockchain: Ethers.js, Uniswap V3 SDK
- Containerization: Docker

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- pnpm
- Firebase CLI
- AWS Account (for Bedrock)
- Docker

### Agent System Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Build and run:
```bash
# Development mode
pnpm dev

# Production build
pnpm build
pnpm start
```

### Docker Deployment

Build and run the agent system:
```bash
# Build image
docker build -t autonomous-agent .

# Run container
docker run -d \
  --name autonomous-agent \
  --env-file .env \
  autonomous-agent
```

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
3. ✅ Firebase Client Integration

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

## Security Considerations

- All spawned agents run in isolated environments
- Multi-sig controlled treasury
- Strict capital allocation limits
- Automated health monitoring and termination
- Comprehensive audit logging

## Contributing
This is a hackathon project for ETHGlobal Agents.

## License
MIT
