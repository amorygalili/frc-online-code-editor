# FRC Challenge Platform - AWS Lambda Functions

This directory contains the AWS Lambda functions that power the backend API for the FRC Programming Challenge Platform.

## 🏗️ Architecture

The backend uses a serverless architecture with:
- **AWS Lambda** - Serverless compute for API endpoints
- **Amazon DynamoDB** - NoSQL database for challenges, user progress, and sessions
- **Amazon API Gateway** - REST API with Cognito authentication
- **AWS Cognito** - User authentication and authorization

## 📁 Project Structure

```
lambda/
├── src/
│   ├── handlers/           # Lambda function handlers
│   │   ├── challenges/     # Challenge management
│   │   ├── progress/       # User progress tracking
│   │   └── sessions/       # Challenge sessions
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Shared utilities
│   └── scripts/            # Data seeding and utilities
├── package.json            # Dependencies and scripts
├── serverless.yml          # Serverless Framework configuration
├── tsconfig.json          # TypeScript configuration
└── webpack.config.js      # Webpack bundling configuration
```

## 🚀 API Endpoints

### Challenge Management
- `GET /challenges` - List challenges with filtering and pagination
- `GET /challenges/{id}` - Get individual challenge details

### User Progress
- `GET /user/progress` - Get user's progress across all challenges
- `PUT /challenges/{id}/progress` - Update progress for a specific challenge

### Challenge Sessions
- `POST /challenges/{id}/sessions` - Create a new challenge session
- `PUT /sessions/{sessionId}/code` - Save code progress in a session

## 🗄️ Database Schema

### Challenges Table
- **Primary Key**: `id` (String)
- **GSI1**: `category` - For filtering by category
- **GSI2**: `difficulty` - For filtering by difficulty

### User Progress Table
- **Primary Key**: `userId` (Hash), `challengeId` (Range)
- **GSI1**: `challengeId` - For querying progress by challenge

### Challenge Sessions Table
- **Primary Key**: `sessionId` (String)
- **GSI1**: `userId` - For querying user sessions
- **GSI2**: `challengeId` - For querying challenge sessions
- **TTL**: Automatic cleanup after 24 hours

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- AWS CLI configured
- Serverless Framework

### Installation
```bash
cd lambda
npm install
```

### Local Development
```bash
# Start local development server
npm run dev

# Run tests
npm test

# Build TypeScript
npm run build

# Lint code
npm run lint
```

### Deployment

#### Development Environment
```bash
npm run deploy:dev
```

#### Production Environment
```bash
npm run deploy:prod
```

### Environment Variables
Set these environment variables before deployment:

```bash
export COGNITO_USER_POOL_ID=your_user_pool_id
```

## 📊 Data Seeding

To populate the database with sample challenges:

```bash
# Build the project first
npm run build

# Run the seeding script
node dist/scripts/seedData.js
```

## 🔐 Authentication

All API endpoints require authentication via AWS Cognito. The frontend should include the JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## 📝 API Usage Examples

### Get Challenges
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.example.com/challenges?category=Basics&difficulty=Beginner"
```

### Update Progress
```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress", "progress": 50}' \
  "https://api.example.com/challenges/1/progress"
```

### Create Session
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  "https://api.example.com/challenges/1/sessions"
```

## 🧪 Testing

The project includes comprehensive tests for all Lambda functions:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📈 Monitoring

The Lambda functions include comprehensive logging and error handling. Monitor the functions using:
- AWS CloudWatch Logs
- AWS X-Ray for distributed tracing
- Custom metrics for business logic

## 🔧 Configuration

### Serverless Framework
The `serverless.yml` file configures:
- Lambda function definitions
- API Gateway routes
- DynamoDB table creation
- IAM permissions
- Environment variables

### TypeScript
The project uses strict TypeScript configuration for type safety and better development experience.

## 🚀 Next Steps

1. **Deploy the Lambda functions** to AWS
2. **Seed the database** with sample challenges
3. **Update the frontend** to use the real API endpoints
4. **Add monitoring and alerting**
5. **Implement additional features** like challenge creation, user management, etc.

## 📚 Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Serverless Framework Guide](https://www.serverless.com/framework/docs/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
