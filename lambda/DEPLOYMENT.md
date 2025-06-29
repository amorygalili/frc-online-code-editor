# AWS Lambda Deployment Guide

This guide walks you through deploying the FRC Challenge Platform Lambda functions to AWS.

## 🎯 Prerequisites

### 1. AWS Account Setup
- AWS account with appropriate permissions
- AWS CLI installed and configured
- IAM user with permissions for:
  - Lambda functions
  - DynamoDB tables
  - API Gateway
  - CloudFormation
  - IAM roles

### 2. Development Tools
```bash
# Install Node.js 18+
node --version  # Should be 18.x or higher

# Install Serverless Framework globally
npm install -g serverless

# Verify installation
serverless --version
```

### 3. AWS CLI Configuration
```bash
# Configure AWS credentials
aws configure

# Verify configuration
aws sts get-caller-identity
```

## 🚀 Deployment Steps

### Step 1: Install Dependencies
```bash
cd lambda
npm install
```

### Step 2: Set Environment Variables
```bash
# Set your Cognito User Pool ID
export COGNITO_USER_POOL_ID=us-east-2_jKbLbHi6v

# Optional: Set custom region (defaults to us-east-1)
export AWS_REGION=us-east-1
```

### Step 3: Deploy to Development Environment
```bash
# Deploy to dev stage
npm run deploy:dev

# Or manually with serverless
serverless deploy --stage dev
```

### Step 4: Verify Deployment
After deployment, you should see output like:
```
Service Information
service: frc-challenge-api
stage: dev
region: us-east-1
stack: frc-challenge-api-dev
resources: 15
api keys:
  None
endpoints:
  GET - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/challenges
  GET - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/challenges/{id}
  GET - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/user/progress
  PUT - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/challenges/{id}/progress
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/challenges/{id}/sessions
  PUT - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/sessions/{sessionId}/code
functions:
  getChallenges: frc-challenge-api-dev-getChallenges
  getChallenge: frc-challenge-api-dev-getChallenge
  getUserProgress: frc-challenge-api-dev-getUserProgress
  updateChallengeProgress: frc-challenge-api-dev-updateChallengeProgress
  createChallengeSession: frc-challenge-api-dev-createChallengeSession
  saveChallengeCode: frc-challenge-api-dev-saveChallengeCode
```

### Step 5: Seed Database with Sample Data
```bash
# Build the project
npm run build

# Set the table names (replace with your actual table names from deployment output)
export CHALLENGES_TABLE=frc-challenge-api-challenges-dev
export USER_PROGRESS_TABLE=frc-challenge-api-user-progress-dev
export CHALLENGE_SESSIONS_TABLE=frc-challenge-api-challenge-sessions-dev

# Run the seeding script
node dist/scripts/seedData.js
```

### Step 6: Test the API
```bash
# Get your JWT token from the frontend application
# Then test the API endpoints

# Test getting challenges (replace with your API Gateway URL and token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/challenges"
```

## 🔧 Configuration

### Environment Variables
The following environment variables are automatically set by Serverless Framework:

- `CHALLENGES_TABLE` - DynamoDB table for challenges
- `USER_PROGRESS_TABLE` - DynamoDB table for user progress
- `CHALLENGE_SESSIONS_TABLE` - DynamoDB table for challenge sessions
- `COGNITO_USER_POOL_ID` - Your Cognito User Pool ID
- `STAGE` - Deployment stage (dev/prod)
- `REGION` - AWS region

### Custom Configuration
You can customize the deployment by modifying `serverless.yml`:

```yaml
# Change memory size
provider:
  memorySize: 512  # Default is 256MB

# Change timeout
provider:
  timeout: 60  # Default is 30 seconds

# Change region
provider:
  region: us-west-2  # Default is us-east-1
```

## 🌍 Production Deployment

### Step 1: Production Environment Variables
```bash
# Set production Cognito User Pool ID
export COGNITO_USER_POOL_ID=your_prod_user_pool_id
```

### Step 2: Deploy to Production
```bash
npm run deploy:prod
```

### Step 3: Update Frontend Configuration
Update your frontend environment variables to point to the production API:

```env
# In your frontend .env.production
VITE_API_BASE_URL=https://your-prod-api.execute-api.us-east-1.amazonaws.com/prod
```

## 🔍 Monitoring and Debugging

### CloudWatch Logs
View function logs in AWS CloudWatch:
```bash
# View logs for a specific function
serverless logs -f getChallenges --stage dev

# Tail logs in real-time
serverless logs -f getChallenges --stage dev --tail
```

### Local Testing
```bash
# Start local development server
serverless offline --stage dev

# Test locally
curl "http://localhost:3000/dev/challenges"
```

### Debug Common Issues

#### 1. Permission Errors
```bash
# Check IAM permissions
aws iam get-user
aws iam list-attached-user-policies --user-name YOUR_USERNAME
```

#### 2. Cognito Configuration
```bash
# Verify Cognito User Pool exists
aws cognito-idp describe-user-pool --user-pool-id YOUR_USER_POOL_ID
```

#### 3. DynamoDB Access
```bash
# List DynamoDB tables
aws dynamodb list-tables

# Check table status
aws dynamodb describe-table --table-name frc-challenge-api-challenges-dev
```

## 🗑️ Cleanup

To remove all AWS resources:
```bash
# Remove development environment
serverless remove --stage dev

# Remove production environment
serverless remove --stage prod
```

## 📊 Cost Optimization

### Lambda Pricing
- First 1M requests per month are free
- $0.20 per 1M requests thereafter
- $0.0000166667 per GB-second

### DynamoDB Pricing
- 25 GB storage free tier
- 25 read/write capacity units free tier
- Pay-per-request pricing for variable workloads

### Estimated Monthly Costs
For a small to medium application:
- Lambda: $0-5/month
- DynamoDB: $0-10/month
- API Gateway: $0-5/month
- **Total: $0-20/month**

## 🔐 Security Best Practices

1. **Use least privilege IAM policies**
2. **Enable API Gateway request validation**
3. **Use AWS WAF for additional protection**
4. **Enable CloudTrail for audit logging**
5. **Rotate Cognito secrets regularly**
6. **Use VPC endpoints for DynamoDB access**

## 📞 Support

If you encounter issues:

1. Check the [AWS Lambda documentation](https://docs.aws.amazon.com/lambda/)
2. Review [Serverless Framework docs](https://www.serverless.com/framework/docs/)
3. Check CloudWatch logs for error details
4. Verify IAM permissions and resource configurations

## 🎉 Next Steps

After successful deployment:

1. **Update frontend** to use the new API endpoints
2. **Test all functionality** end-to-end
3. **Set up monitoring** and alerting
4. **Configure CI/CD pipeline** for automated deployments
5. **Add additional features** like admin functions, analytics, etc.
