#!/bin/bash

# Build and Push Script for FRC Challenge Runtime Container
# This script builds the Docker image and pushes it to ECR

set -e

# Load environment variables
if [ -f .env.ecr ]; then
    source .env.ecr
else
    echo "❌ .env.ecr file not found. Run create-repository.sh first."
    exit 1
fi

# Configuration
DOCKER_CONTEXT="${DOCKER_CONTEXT:-../docker}"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
BUILD_ARGS="${BUILD_ARGS:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Building and pushing FRC Challenge Runtime container...${NC}"

# Validate required variables
if [ -z "$AWS_ACCOUNT_ID" ] || [ -z "$AWS_REGION" ] || [ -z "$REPOSITORY_NAME" ]; then
    echo -e "${RED}❌ Missing required environment variables${NC}"
    echo "Required: AWS_ACCOUNT_ID, AWS_REGION, REPOSITORY_NAME"
    exit 1
fi

# Check if Docker context exists
if [ ! -d "$DOCKER_CONTEXT" ]; then
    echo -e "${RED}❌ Docker context directory not found: $DOCKER_CONTEXT${NC}"
    exit 1
fi

# Check if Dockerfile exists
if [ ! -f "$DOCKER_CONTEXT/$DOCKERFILE" ]; then
    echo -e "${RED}❌ Dockerfile not found: $DOCKER_CONTEXT/$DOCKERFILE${NC}"
    exit 1
fi

# Get AWS account ID if not set
if [ -z "$AWS_ACCOUNT_ID" ]; then
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
fi

# Set repository URI
REPOSITORY_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPOSITORY_NAME}"

echo -e "${GREEN}Configuration:${NC}"
echo -e "  AWS Account ID: ${AWS_ACCOUNT_ID}"
echo -e "  AWS Region: ${AWS_REGION}"
echo -e "  Repository: ${REPOSITORY_NAME}"
echo -e "  Repository URI: ${REPOSITORY_URI}"
echo -e "  Docker Context: ${DOCKER_CONTEXT}"
echo -e "  Dockerfile: ${DOCKERFILE}"
echo -e "  Image Tag: ${IMAGE_TAG}"

# Authenticate Docker to ECR
echo -e "${YELLOW}🔐 Authenticating Docker to ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $REPOSITORY_URI

# Build the Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
cd $DOCKER_CONTEXT

# Build with optional build args
if [ -n "$BUILD_ARGS" ]; then
    echo -e "${BLUE}Using build args: $BUILD_ARGS${NC}"
    docker build $BUILD_ARGS -t $REPOSITORY_NAME:$IMAGE_TAG -f $DOCKERFILE .
else
    docker build -t $REPOSITORY_NAME:$IMAGE_TAG -f $DOCKERFILE .
fi

# Tag the image for ECR
echo -e "${YELLOW}🏷️  Tagging image for ECR...${NC}"
docker tag $REPOSITORY_NAME:$IMAGE_TAG $REPOSITORY_URI:$IMAGE_TAG

# Also tag as latest if not already latest
if [ "$IMAGE_TAG" != "latest" ]; then
    docker tag $REPOSITORY_NAME:$IMAGE_TAG $REPOSITORY_URI:latest
fi

# Push the image to ECR
echo -e "${YELLOW}📤 Pushing image to ECR...${NC}"
docker push $REPOSITORY_URI:$IMAGE_TAG

if [ "$IMAGE_TAG" != "latest" ]; then
    docker push $REPOSITORY_URI:latest
fi

# Get image information
IMAGE_DIGEST=$(aws ecr describe-images --repository-name $REPOSITORY_NAME --image-ids imageTag=$IMAGE_TAG --region $AWS_REGION --query 'imageDetails[0].imageDigest' --output text)
IMAGE_SIZE=$(aws ecr describe-images --repository-name $REPOSITORY_NAME --image-ids imageTag=$IMAGE_TAG --region $AWS_REGION --query 'imageDetails[0].imageSizeInBytes' --output text)
IMAGE_SIZE_MB=$((IMAGE_SIZE / 1024 / 1024))

echo -e "${GREEN}✅ Image pushed successfully!${NC}"
echo -e "${GREEN}Image URI: ${REPOSITORY_URI}:${IMAGE_TAG}${NC}"
echo -e "${GREEN}Image Digest: ${IMAGE_DIGEST}${NC}"
echo -e "${GREEN}Image Size: ${IMAGE_SIZE_MB} MB${NC}"

# Update environment file with latest image info
cat >> .env.ecr << EOF

# Latest Build Information
LATEST_IMAGE_TAG=${IMAGE_TAG}
LATEST_IMAGE_URI=${REPOSITORY_URI}:${IMAGE_TAG}
LATEST_IMAGE_DIGEST=${IMAGE_DIGEST}
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

echo -e "${BLUE}📝 Build information updated in .env.ecr${NC}"

# Clean up local images to save space (optional)
read -p "Do you want to clean up local Docker images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 Cleaning up local images...${NC}"
    docker rmi $REPOSITORY_NAME:$IMAGE_TAG || true
    docker rmi $REPOSITORY_URI:$IMAGE_TAG || true
    if [ "$IMAGE_TAG" != "latest" ]; then
        docker rmi $REPOSITORY_URI:latest || true
    fi
    echo -e "${GREEN}✅ Local images cleaned up${NC}"
fi

echo -e "${GREEN}🎉 Build and push completed successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Update your ECS task definition with: ${REPOSITORY_URI}:${IMAGE_TAG}"
echo -e "2. Deploy your ECS service or run standalone tasks"
