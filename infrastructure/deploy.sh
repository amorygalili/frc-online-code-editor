#!/bin/bash

# Deployment script for FRC Challenge Site ECS Fargate Infrastructure
# This script deploys the complete infrastructure in the correct order

set -e

# Configuration
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="frc-challenge-site"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check if AWS credentials are configured
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Deploy infrastructure
deploy_infrastructure() {
    log "Deploying ECS cluster infrastructure..."
    
    cd infrastructure/ecs
    
    # Deploy CloudFormation stack
    aws cloudformation deploy \
        --template-file cluster-infrastructure.yaml \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
        --parameter-overrides \
            Environment=${ENVIRONMENT} \
            ProjectName=${PROJECT_NAME} \
        --capabilities CAPABILITY_IAM \
        --region ${AWS_REGION}
    
    log "Infrastructure deployment completed"
}

# Create ECR repository
setup_ecr() {
    log "Setting up ECR repository..."
    
    cd ../ecr
    ./create-repository.sh
    
    log "ECR repository setup completed"
}

# Build and push container
build_container() {
    log "Building and pushing container image..."
    
    # Source ECR environment variables
    if [ -f .env.ecr ]; then
        source .env.ecr
    else
        error ".env.ecr file not found. Run ECR setup first."
        exit 1
    fi
    
    ./build-and-push.sh
    
    log "Container build and push completed"
}

# Register ECS task definition
register_task_definition() {
    log "Registering ECS task definition..."
    
    cd ../ecs
    
    # Get infrastructure outputs
    VPC_ID=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
        --query 'Stacks[0].Outputs[?OutputKey==`VPCId`].OutputValue' \
        --output text \
        --region ${AWS_REGION})
    
    PRIVATE_SUBNET_1=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
        --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnet1Id`].OutputValue' \
        --output text \
        --region ${AWS_REGION})
    
    PRIVATE_SUBNET_2=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
        --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnet2Id`].OutputValue' \
        --output text \
        --region ${AWS_REGION})
    
    SECURITY_GROUP=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
        --query 'Stacks[0].Outputs[?OutputKey==`ChallengeRuntimeSecurityGroupId`].OutputValue' \
        --output text \
        --region ${AWS_REGION})
    
    EFS_ID=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
        --query 'Stacks[0].Outputs[?OutputKey==`EFSFileSystemId`].OutputValue' \
        --output text \
        --region ${AWS_REGION})
    
    EFS_ACCESS_POINT=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
        --query 'Stacks[0].Outputs[?OutputKey==`EFSAccessPointId`].OutputValue' \
        --output text \
        --region ${AWS_REGION})
    
    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Source ECR variables
    source ../ecr/.env.ecr
    
    # Replace placeholders in task definition
    sed -e "s/\${AWS_ACCOUNT_ID}/${AWS_ACCOUNT_ID}/g" \
        -e "s/\${AWS_REGION}/${AWS_REGION}/g" \
        -e "s/\${ENVIRONMENT}/${ENVIRONMENT}/g" \
        -e "s/\${EFS_FILE_SYSTEM_ID}/${EFS_ID}/g" \
        -e "s/\${EFS_ACCESS_POINT_ID}/${EFS_ACCESS_POINT}/g" \
        task-definition-template.json > task-definition-final.json
    
    # Register task definition
    aws ecs register-task-definition \
        --cli-input-json file://task-definition-final.json \
        --region ${AWS_REGION}
    
    log "Task definition registered successfully"
}

# Deploy Lambda functions
deploy_lambda() {
    log "Deploying Lambda functions..."
    
    cd ../../lambda
    
    # Set environment variables for Lambda deployment
    export ECS_CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-cluster"
    export ECS_TASK_DEFINITION="frc-challenge-runtime"
    export PRIVATE_SUBNET_1=${PRIVATE_SUBNET_1}
    export PRIVATE_SUBNET_2=${PRIVATE_SUBNET_2}
    export CHALLENGE_RUNTIME_SECURITY_GROUP=${SECURITY_GROUP}
    
    # Deploy Lambda functions
    npm run deploy:${ENVIRONMENT}
    
    log "Lambda functions deployed successfully"
}

# Main deployment function
main() {
    log "Starting FRC Challenge Site deployment for environment: ${ENVIRONMENT}"
    
    check_prerequisites
    
    # Step 1: Deploy infrastructure
    deploy_infrastructure
    
    # Step 2: Set up ECR repository
    setup_ecr
    
    # Step 3: Build and push container
    build_container
    
    # Step 4: Register task definition
    register_task_definition
    
    # Step 5: Deploy Lambda functions
    deploy_lambda
    
    log "🎉 Deployment completed successfully!"
    log "Environment: ${ENVIRONMENT}"
    log "Region: ${AWS_REGION}"
    
    # Output useful information
    echo -e "\n${BLUE}📋 Deployment Summary:${NC}"
    echo -e "• ECS Cluster: ${PROJECT_NAME}-${ENVIRONMENT}-cluster"
    echo -e "• Task Definition: frc-challenge-runtime"
    echo -e "• ECR Repository: ${REPOSITORY_URI}"
    echo -e "• VPC ID: ${VPC_ID}"
    echo -e "• Private Subnets: ${PRIVATE_SUBNET_1}, ${PRIVATE_SUBNET_2}"
    echo -e "• Security Group: ${SECURITY_GROUP}"
    echo -e "• EFS File System: ${EFS_ID}"
    
    echo -e "\n${YELLOW}🔗 Next Steps:${NC}"
    echo -e "1. Test session creation via API"
    echo -e "2. Monitor CloudWatch logs"
    echo -e "3. Set up monitoring dashboards"
    echo -e "4. Configure domain and SSL certificates"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "infrastructure")
        check_prerequisites
        deploy_infrastructure
        ;;
    "ecr")
        check_prerequisites
        setup_ecr
        ;;
    "container")
        check_prerequisites
        build_container
        ;;
    "task-definition")
        check_prerequisites
        register_task_definition
        ;;
    "lambda")
        check_prerequisites
        deploy_lambda
        ;;
    *)
        echo "Usage: $0 [deploy|infrastructure|ecr|container|task-definition|lambda]"
        exit 1
        ;;
esac
