#!/bin/bash

# Vinco MAM AWS Deployment Script
# Deploys to eu-west-2 (London)

set -e

echo "🚀 Vinco MAM AWS Deployment"
echo "============================"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ ERROR: Docker is not installed or not in PATH"
    echo ""
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    echo "Then start Docker Desktop and run this script again."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ ERROR: Docker is installed but not running"
    echo ""
    echo "Please start Docker Desktop and run this script again."
    exit 1
fi

echo "✅ Docker is installed and running"
echo ""

# Set region to eu-west-2 (London)
export CDK_DEFAULT_REGION=eu-west-2
export AWS_DEFAULT_REGION=eu-west-2

# Get AWS account
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text --region eu-west-2)

echo "📋 Deployment Configuration:"
echo "   Account: $CDK_DEFAULT_ACCOUNT"
echo "   Region:  $CDK_DEFAULT_REGION (London)"
echo ""

# Bootstrap CDK (if not already done)
echo "🔧 Bootstrapping CDK environment..."
npx cdk bootstrap --region eu-west-2 || echo "Bootstrap may already be complete"

echo ""
echo "📦 Deploying Vinco MAM stack..."
echo ""

# Deploy the stack
npx cdk deploy --region eu-west-2 --require-approval never

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Create Rekognition collection:"
echo "   aws rekognition create-collection --collection-id vinco-athletes --region eu-west-2"
echo ""
echo "2. Note the API endpoints from the deployment output above"
echo "3. Update WordPress plugin settings with the endpoints"
