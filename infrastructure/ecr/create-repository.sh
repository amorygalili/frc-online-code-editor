#!/bin/bash

# ECR Repository Creation Script for FRC Challenge Runtime
# This script creates the ECR repository and sets up the necessary permissions

set -e

# Configuration
REPOSITORY_NAME="frc-challenge-runtime"
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Creating ECR repository for FRC Challenge Runtime...${NC}"

# Check if repository already exists
if aws ecr describe-repositories --repository-names $REPOSITORY_NAME --region $AWS_REGION >/dev/null 2>&1; then
    echo -e "${YELLOW}Repository $REPOSITORY_NAME already exists${NC}"
else
    echo -e "${GREEN}Creating repository $REPOSITORY_NAME...${NC}"
    aws ecr create-repository \
        --repository-name $REPOSITORY_NAME \
        --region $AWS_REGION \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256
fi

# Set lifecycle policy to manage image retention
echo -e "${GREEN}Setting lifecycle policy...${NC}"
cat > /tmp/lifecycle-policy.json << EOF
{
    "rules": [
        {
            "rulePriority": 1,
            "description": "Keep last 10 production images",
            "selection": {
                "tagStatus": "tagged",
                "tagPrefixList": ["latest", "prod", "v"],
                "countType": "imageCountMoreThan",
                "countNumber": 10
            },
            "action": {
                "type": "expire"
            }
        },
        {
            "rulePriority": 2,
            "description": "Keep last 5 development images",
            "selection": {
                "tagStatus": "tagged",
                "tagPrefixList": ["dev", "staging"],
                "countType": "imageCountMoreThan",
                "countNumber": 5
            },
            "action": {
                "type": "expire"
            }
        },
        {
            "rulePriority": 3,
            "description": "Delete untagged images older than 1 day",
            "selection": {
                "tagStatus": "untagged",
                "countType": "sinceImagePushed",
                "countUnit": "days",
                "countNumber": 1
            },
            "action": {
                "type": "expire"
            }
        }
    ]
}
EOF

aws ecr put-lifecycle-policy \
    --repository-name $REPOSITORY_NAME \
    --region $AWS_REGION \
    --lifecycle-policy-text file:///tmp/lifecycle-policy.json

# Set repository policy for cross-account access if needed
echo -e "${GREEN}Setting repository policy...${NC}"
cat > /tmp/repository-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowPushPull",
            "Effect": "Allow",
            "Principal": {
                "AWS": [
                    "arn:aws:iam::${AWS_ACCOUNT_ID}:root"
                ]
            },
            "Action": [
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:BatchCheckLayerAvailability",
                "ecr:PutImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload"
            ]
        }
    ]
}
EOF

aws ecr set-repository-policy \
    --repository-name $REPOSITORY_NAME \
    --region $AWS_REGION \
    --policy-text file:///tmp/repository-policy.json

# Clean up temporary files
rm -f /tmp/lifecycle-policy.json /tmp/repository-policy.json

# Output repository information
REPOSITORY_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPOSITORY_NAME}"

echo -e "${GREEN}✅ ECR repository created successfully!${NC}"
echo -e "${GREEN}Repository URI: ${REPOSITORY_URI}${NC}"
echo -e "${GREEN}Repository ARN: arn:aws:ecr:${AWS_REGION}:${AWS_ACCOUNT_ID}:repository/${REPOSITORY_NAME}${NC}"

# Create environment file for build scripts
cat > .env.ecr << EOF
# ECR Configuration
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}
AWS_REGION=${AWS_REGION}
REPOSITORY_NAME=${REPOSITORY_NAME}
REPOSITORY_URI=${REPOSITORY_URI}
EOF

echo -e "${GREEN}Environment configuration saved to .env.ecr${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Run ./build-and-push.sh to build and push your Docker image"
echo -e "2. Update your ECS task definition with the repository URI"
echo -e "3. Deploy your ECS service"
