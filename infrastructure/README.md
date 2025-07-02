# FRC Challenge Site - ECS Fargate Deployment

This directory contains the infrastructure and deployment scripts for deploying the FRC Challenge Site on AWS ECS Fargate.

## 🏗️ Architecture Overview

The deployment creates:
- **ECS Fargate Cluster** - Runs containerized challenge sessions
- **VPC with Private Subnets** - Secure networking for containers
- **EFS File System** - Persistent storage for user workspaces
- **ECR Repository** - Container image storage
- **Lambda Functions** - Session management API
- **Security Groups** - Network access controls

## 📋 Prerequisites

Before deploying, ensure you have:

1. **AWS CLI** configured with appropriate permissions
2. **Docker** installed and running
3. **Node.js 18+** for Lambda functions
4. **AWS Account** with sufficient permissions

### Required AWS Permissions

Your AWS user/role needs permissions for:
- CloudFormation (create/update stacks)
- ECS (create clusters, task definitions, run tasks)
- ECR (create repositories, push images)
- Lambda (create/update functions)
- IAM (create roles and policies)
- VPC (create networking resources)
- EFS (create file systems)
- DynamoDB (create tables)

## 🚀 Quick Start

### 1. Set Environment Variables

Create a `.env` file in the infrastructure directory:

```bash
# AWS Configuration
AWS_REGION=us-east-1
ENVIRONMENT=dev

# Cognito Configuration (from your existing setup)
COGNITO_USER_POOL_ID=your_user_pool_id_here

# Optional: Custom naming
PROJECT_NAME=frc-challenge-site
```

### 2. Run Full Deployment

```bash
# Make scripts executable
chmod +x deploy.sh ecr/create-repository.sh ecr/build-and-push.sh

# Deploy everything
./deploy.sh
```

This will:
1. Deploy the ECS cluster infrastructure
2. Create ECR repository
3. Build and push the container image
4. Register the ECS task definition
5. Deploy Lambda functions

## 📁 Directory Structure

```
infrastructure/
├── deploy.sh                    # Main deployment script
├── README.md                    # This file
├── ecs/
│   ├── cluster-infrastructure.yaml    # CloudFormation template
│   ├── task-definition.json          # ECS task definition
│   ├── task-definition-template.json # Template with placeholders
│   ├── standalone-task-config.json   # Config for individual tasks
│   └── task-configs.yaml            # Resource profiles
├── ecr/
│   ├── create-repository.sh          # ECR setup script
│   ├── build-and-push.sh            # Container build script
│   ├── Dockerfile.prod              # Production Dockerfile
│   └── healthcheck.sh               # Container health check
└── lambda/                          # Lambda function deployment
```

## 🔧 Step-by-Step Deployment

If you prefer to deploy components individually:

### Step 1: Deploy Infrastructure

```bash
./deploy.sh infrastructure
```

This creates:
- VPC with public/private subnets
- ECS cluster
- Security groups
- EFS file system
- CloudWatch log groups

### Step 2: Set Up ECR Repository

```bash
./deploy.sh ecr
```

This creates:
- ECR repository with lifecycle policies
- Authentication configuration
- Environment file with repository details

### Step 3: Build and Push Container

```bash
./deploy.sh container
```

This:
- Builds the Docker image from your Monaco editor setup
- Tags and pushes to ECR
- Updates environment configuration

### Step 4: Register Task Definition

```bash
./deploy.sh task-definition
```

This:
- Creates ECS task definition with proper resource allocation
- Configures networking and storage
- Sets up health checks and logging

### Step 5: Deploy Lambda Functions

```bash
./deploy.sh lambda
```

This:
- Deploys session management API functions
- Sets up scheduled cleanup
- Configures API Gateway endpoints

## 🎯 Session Management Flow

### Creating a Challenge Session

1. **Student clicks "Start Challenge"** in frontend
2. **Frontend calls** `POST /sessions` with challengeId
3. **Lambda function**:
   - Validates user and challenge
   - Checks session limits (max 3 per user)
   - Creates ECS Fargate task with user-specific environment
   - Stores session metadata in DynamoDB
4. **ECS starts container** with isolated workspace
5. **Frontend polls** `GET /sessions/{id}` until status is "running"
6. **Student codes** in their dedicated environment

### Session Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   starting  │───▶│   running   │───▶│  stopping   │───▶│   stopped   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │   failed    │    │    idle     │    │  expired    │
   └─────────────┘    └─────────────┘    └─────────────┘
```

### Automatic Cleanup

A scheduled Lambda function runs every 5 minutes to:
- Terminate expired sessions (2 hour limit)
- Clean up idle sessions (30 minutes no activity)
- Remove orphaned ECS tasks
- Update session statuses

## 🔒 Security Features

### Network Security
- Containers run in private subnets (no direct internet access)
- Security groups restrict access to necessary ports only
- NAT gateways provide controlled outbound access

### Container Security
- Non-root user execution
- Resource limits (CPU/memory)
- Read-only base filesystem
- Isolated workspaces per user

### Data Security
- EFS encryption at rest and in transit
- CloudWatch logs encryption
- Secrets stored in AWS Secrets Manager

## 📊 Monitoring and Logging

### CloudWatch Integration
- Container logs automatically sent to CloudWatch
- ECS cluster metrics and insights enabled
- Custom metrics for session management

### Key Metrics to Monitor
- Active session count
- Container startup time
- Session success/failure rates
- Resource utilization
- API response times

## 💰 Cost Optimization

### Resource Profiles
Different container sizes based on challenge complexity:

- **Development**: 0.5 vCPU, 1GB RAM (~$0.02/hour)
- **Basic**: 1 vCPU, 2GB RAM (~$0.04/hour)
- **Advanced**: 2 vCPU, 4GB RAM (~$0.08/hour)
- **Competition**: 4 vCPU, 8GB RAM (~$0.16/hour)

### Cost-Saving Features
- Automatic session cleanup prevents runaway costs
- Fargate Spot pricing for non-critical workloads
- EFS Intelligent Tiering for storage optimization
- Lambda pay-per-request pricing

## 🔧 Configuration

### Environment Variables

The deployment uses these environment variables:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# ECS Configuration
ECS_CLUSTER_NAME=frc-challenge-site-dev-cluster
ECS_TASK_DEFINITION=frc-challenge-runtime
PRIVATE_SUBNET_1=subnet-12345
PRIVATE_SUBNET_2=subnet-67890
CHALLENGE_RUNTIME_SECURITY_GROUP=sg-abcdef

# Application Configuration
COGNITO_USER_POOL_ID=us-east-1_AbCdEfGhI
NODE_ENV=production
```

### Resource Limits

Default session limits (configurable in Lambda code):
- Max 3 concurrent sessions per user
- 2 hour session timeout
- 30 minute idle timeout
- 500MB max workspace size

## 🚨 Troubleshooting

### Common Issues

1. **Container fails to start**
   - Check CloudWatch logs for container errors
   - Verify ECR image exists and is accessible
   - Check EFS mount permissions

2. **Session creation fails**
   - Verify ECS cluster is running
   - Check Lambda function permissions
   - Ensure subnets have available IP addresses

3. **High costs**
   - Check for orphaned tasks
   - Verify cleanup function is running
   - Monitor session duration patterns

### Debugging Commands

```bash
# Check ECS cluster status
aws ecs describe-clusters --clusters frc-challenge-site-dev-cluster

# List running tasks
aws ecs list-tasks --cluster frc-challenge-site-dev-cluster

# View container logs
aws logs tail /ecs/frc-challenge-runtime --follow

# Check Lambda function logs
aws logs tail /aws/lambda/frc-challenge-api-dev-createSession --follow
```

## 🔄 Updates and Maintenance

### Updating Container Image
```bash
# Build and push new image
./deploy.sh container

# Update task definition (if needed)
./deploy.sh task-definition
```

### Updating Lambda Functions
```bash
cd lambda
npm run deploy:dev
```

### Infrastructure Updates
```bash
# Update CloudFormation stack
./deploy.sh infrastructure
```

## 📞 Support

For issues or questions:
1. Check CloudWatch logs first
2. Review this documentation
3. Check AWS service health dashboard
4. Contact the development team

## 🎯 Next Steps

After successful deployment:
1. Test session creation via API
2. Set up monitoring dashboards
3. Configure custom domain and SSL
4. Implement backup strategies
5. Set up CI/CD pipeline
