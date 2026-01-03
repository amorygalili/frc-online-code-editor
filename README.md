# FRC Online Code Editor

A web-based platform for learning FRC robot programming with interactive challenges.

## Prerequisites

- Node.js 18+
- Docker
- AWS CLI (for deployment)

## Local Development

Start the backend (LocalStack + Lambda API + Challenge Runtime):
```bash
cd lambda
npm install
npm run local
```

In a separate terminal, start the frontend:
```bash
cd frc-challenge-site
npm install
npm run dev:local
```

The frontend will be available at `http://localhost:5173`.

To view/edit DynamoDB data, open the admin GUI:
```bash
cd lambda
npm run local:db
```
Or visit `http://localhost:8001` directly.

To stop the backend containers:
```bash
cd lambda
npm run local:stop
```

## Deployment

### Frontend (frc-challenge-site)
```bash
cd frc-challenge-site
npm run build
# Deploy dist/ to your hosting (S3, CloudFront, etc.)
```

### Lambda API
```bash
cd lambda
npm run deploy                  # Deploy to dev (default)
npm run deploy -- --stage prod  # Deploy to prod
```

### Infrastructure
```bash
cd infrastructure
npm run deploy
```