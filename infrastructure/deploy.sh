#!/bin/bash

# Deployment script for FRC Challenge Site ECS Fargate Infrastructure
# This script deploys the complete infrastructure in the correct order

set -e

# Configuration
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-2}"
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

# Function to get serverless deployment bucket name
get_serverless_bucket() {
    log "Looking for Serverless deployment bucket for ALB access logs..."

    # Try to get bucket from serverless state file (adjust path based on current directory)
    local state_file=""
    if [ -f "../../lambda/.serverless/serverless-state.json" ]; then
        state_file="../../lambda/.serverless/serverless-state.json"
    elif [ -f "../lambda/.serverless/serverless-state.json" ]; then
        state_file="../lambda/.serverless/serverless-state.json"
    elif [ -f "lambda/.serverless/serverless-state.json" ]; then
        state_file="lambda/.serverless/serverless-state.json"
    fi

    if [ -n "$state_file" ]; then
        log "Found serverless state file at: $state_file"
        BUCKET_NAME=$(grep -o '"ServerlessDeploymentBucket"[^}]*"Ref":"[^"]*"' "$state_file" | grep -o 'serverless-[^"]*' | head -1)
        if [ -n "$BUCKET_NAME" ]; then
            log "Found serverless bucket from state file: $BUCKET_NAME"
            echo "$BUCKET_NAME"
            return 0
        fi
    else
        log "No serverless state file found"
    fi

    # Try to list buckets with serverless prefix
    log "Searching for serverless buckets via AWS API..."
    if ! aws s3api list-buckets --region $AWS_REGION >/dev/null 2>&1; then
        error "Failed to list S3 buckets. Check your AWS credentials and permissions."
        return 1
    fi

    BUCKET_NAME=$(aws s3api list-buckets --query "Buckets[?starts_with(Name, 'serverless-frc-challenge-api-${ENVIRONMENT}-')].Name" --output text --region $AWS_REGION | head -1)
    if [ -n "$BUCKET_NAME" ] && [ "$BUCKET_NAME" != "None" ]; then
        log "Found serverless bucket from AWS: $BUCKET_NAME"
        echo "$BUCKET_NAME"
        return 0
    fi

    # Try broader search pattern
    log "Trying broader search pattern..."
    BUCKET_NAME=$(aws s3api list-buckets --query "Buckets[?starts_with(Name, 'serverless-')].Name" --output text --region $AWS_REGION | grep "frc-challenge-api" | head -1)
    if [ -n "$BUCKET_NAME" ] && [ "$BUCKET_NAME" != "None" ]; then
        log "Found serverless bucket with broader search: $BUCKET_NAME"
        echo "$BUCKET_NAME"
        return 0
    fi

    error "Could not find Serverless deployment bucket for ALB access logs."
    error "This usually means:"
    error "  1. The Lambda functions haven't been deployed yet (run: cd lambda && npm run deploy:dev)"
    error "  2. The serverless bucket was created in a different region"
    error "  3. The bucket naming pattern has changed"
    error ""
    error "To fix this, either:"
    error "  - Deploy the Lambda functions first to create the serverless bucket"
    error "  - Or modify the infrastructure to create a dedicated ALB logs bucket"
    return 1
}

# Function to update bucket policy for ALB access logs
update_bucket_policy_for_alb() {
    local bucket_name=$1
    if [ -z "$bucket_name" ]; then
        return 0
    fi

    log "Updating bucket policy to allow ALB access logs..."

    # Create policy that includes ALB permissions
    cat > /tmp/bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ServerlessDeploymentBucketAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "serverless.amazonaws.com"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::${bucket_name}/*"
    },
    {
      "Sid": "ALBAccessLogsWrite",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::033677994240:root"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::${bucket_name}/alb-logs/*"
    },
    {
      "Sid": "ALBAccessLogsAclCheck",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::033677994240:root"
      },
      "Action": "s3:GetBucketAcl",
      "Resource": "arn:aws:s3:::${bucket_name}"
    }
  ]
}
EOF

    # Apply the policy
    if aws s3api put-bucket-policy --bucket "$bucket_name" --policy file:///tmp/bucket-policy.json --region $AWS_REGION; then
        log "Updated bucket policy for ALB access logs"
    else
        warn "Failed to update bucket policy - ALB access logs may not work"
    fi

    # Clean up
    rm -f /tmp/bucket-policy.json
}


# Deploy infrastructure
deploy_infrastructure() {
    log "Deploying ECS cluster infrastructure..."

    cd ecs

    # Get serverless bucket for ALB access logs
    if SERVERLESS_BUCKET=$(get_serverless_bucket); then
        log "Found serverless bucket: $SERVERLESS_BUCKET"
    else
        log "Failed to find serverless bucket: $SERVERLESS_BUCKET"
        exit 1
    fi

    log "Found bucket: '$SERVERLESS_BUCKET'"

    # Update bucket policy if we found a bucket
    if [ -n "$SERVERLESS_BUCKET" ]; then
        log "Updating bucket policy for: $SERVERLESS_BUCKET"
        update_bucket_policy_for_alb "$SERVERLESS_BUCKET"
    fi

    # Prepare parameter overrides
    PARAM_OVERRIDES="Environment=${ENVIRONMENT} ProjectName=${PROJECT_NAME}"
    if [ -n "$SERVERLESS_BUCKET" ]; then
        PARAM_OVERRIDES="${PARAM_OVERRIDES} ServerlessDeploymentBucketName=${SERVERLESS_BUCKET}"
        log "ALB access logs will be enabled using bucket: $SERVERLESS_BUCKET"
    else
        log "ALB access logs will be disabled (no serverless bucket found)"
    fi

    # Deploy CloudFormation stack
    aws cloudformation deploy \
        --template-file cluster-infrastructure.yaml \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
        --parameter-overrides $PARAM_OVERRIDES \
        --capabilities CAPABILITY_IAM \
        --region ${AWS_REGION}

    log "Infrastructure deployment completed"

    if [ -n "$SERVERLESS_BUCKET" ]; then
        log "ALB access logs are enabled and will appear in S3 within 5-60 minutes of traffic"
        log "View logs at: https://s3.console.aws.amazon.com/s3/buckets/${SERVERLESS_BUCKET}?prefix=alb-logs/"
    fi
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

    # Get infrastructure values if not already set
    if [ -z "${PRIVATE_SUBNET_1}" ] || [ -z "${PRIVATE_SUBNET_2}" ] || [ -z "${SECURITY_GROUP}" ]; then
        log "Getting infrastructure configuration..."

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
    fi

    cd ../lambda

    # Set environment variables for Lambda deployment
    export ECS_CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-cluster"
    export ECS_TASK_DEFINITION="frc-challenge-runtime"
    export PRIVATE_SUBNET_1=${PRIVATE_SUBNET_1}
    export PRIVATE_SUBNET_2=${PRIVATE_SUBNET_2}
    export CHALLENGE_RUNTIME_SECURITY_GROUP=${SECURITY_GROUP}

    # Get ALB configuration from infrastructure stack
    ALB_ARN=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerArn`].OutputValue' \
        --output text \
        --region ${AWS_REGION})

    log "Debug: ALB_ARN = ${ALB_ARN}"

    if [ -z "${ALB_ARN}" ] || [ "${ALB_ARN}" = "None" ]; then
        log "ERROR: Could not get LoadBalancerArn from CloudFormation stack"
        exit 1
    fi

    export ALB_LISTENER_ARN=$(aws elbv2 describe-listeners \
        --load-balancer-arn "${ALB_ARN}" \
        --query 'Listeners[0].ListenerArn' \
        --output text \
        --region ${AWS_REGION})

    export ALB_TARGET_GROUP_ARN=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
        --query 'Stacks[0].Outputs[?OutputKey==`DefaultTargetGroupArn`].OutputValue' \
        --output text \
        --region ${AWS_REGION})

    export ALB_DNS_NAME=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNSName`].OutputValue' \
        --output text \
        --region ${AWS_REGION})

    export VPC_ID=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-infrastructure" \
        --query 'Stacks[0].Outputs[?OutputKey==`VPCId`].OutputValue' \
        --output text \
        --region ${AWS_REGION})

    log "ALB Configuration:"
    log "  Listener ARN: ${ALB_LISTENER_ARN}"
    log "  Target Group ARN: ${ALB_TARGET_GROUP_ARN}"
    log "  DNS Name: ${ALB_DNS_NAME}"
    log "  VPC ID: ${VPC_ID}"
    log "  PRIVATE_SUBNET_1: ${PRIVATE_SUBNET_1}"
    log "  PRIVATE_SUBNET_2: ${PRIVATE_SUBNET_2}"
    
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
