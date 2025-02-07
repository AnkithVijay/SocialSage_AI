# Autonomous Agent System

A self-replicating autonomous agent system for identifying and capitalizing on DeFi opportunities.

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

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Build the project:
```bash
pnpm build
```

4. Run the system:
```bash
pnpm start
```

## Docker Deployment

Build the Docker image:
```bash
docker build -t autonomous-agent .
```

Run the container:
```bash
docker run -d \
  --name autonomous-agent \
  --env-file .env \
  autonomous-agent
```

## Development

1. Run in development mode:
```bash
pnpm dev
```

2. Run tests:
```bash
pnpm test
```

## Security Considerations

- All spawned agents run in isolated environments
- Multi-sig controlled treasury
- Strict capital allocation limits
- Automated health monitoring and termination
- Comprehensive audit logging

## License

MIT 