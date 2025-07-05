#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const config = {
  environment: process.env.ENVIRONMENT || 'dev',
  awsRegion: process.env.AWS_REGION || 'us-east-2',
  projectName: 'frc-challenge-site'
};

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Logging functions
function log(message) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`${colors.green}[${timestamp}] ${message}${colors.reset}`);
}

function warn(message) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`${colors.yellow}[${timestamp}] WARNING: ${message}${colors.reset}`);
}

function error(message) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.error(`${colors.red}[${timestamp}] ERROR: ${message}${colors.reset}`);
}

// Utility function to run shell commands
function runCommand(command, options = {}) {
  try {
    log(`Running: ${command}`);
    const result = execSync(command, { 
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      ...options
    });
    return result;
  } catch (err) {
    error(`Command failed: ${command}`);
    error(`Error: ${err.message}`);
    if (err.stdout) error(`Stdout: ${err.stdout}`);
    if (err.stderr) error(`Stderr: ${err.stderr}`);
    throw err;
  }
}

// Check prerequisites
function checkPrerequisites() {
  log('Checking prerequisites...');
  
  const commands = [
    { cmd: 'aws --version', name: 'AWS CLI' },
    { cmd: 'docker --version', name: 'Docker' },
    { cmd: 'node --version', name: 'Node.js' }
  ];
  
  for (const { cmd, name } of commands) {
    try {
      runCommand(cmd, { silent: true });
    } catch (err) {
      error(`${name} is not installed or not accessible`);
      throw new Error(`Missing prerequisite: ${name}`);
    }
  }
  
  // Check AWS credentials
  try {
    runCommand('aws sts get-caller-identity', { silent: true });
  } catch (err) {
    error('AWS credentials not configured');
    throw new Error('AWS credentials not configured');
  }
  
  log('Prerequisites check passed');
}

// Function to find serverless deployment bucket
async function getServerlessBucket() {

  return "frc-challenge-api-dev-serverlessdeploymentbucket-kvqup7waljnb";

  log('Looking for Serverless deployment bucket for ALB access logs...');
  
  // Try to find serverless state file
  const possiblePaths = [
    '../../lambda/.serverless/serverless-state.json',
    '../lambda/.serverless/serverless-state.json',
    'lambda/.serverless/serverless-state.json'
  ];
  
  let stateFile = null;
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      stateFile = filePath;
      log(`Found serverless state file at: ${filePath}`);
      break;
    }
  }
  
  if (stateFile) {
    try {
      const stateContent = fs.readFileSync(stateFile, 'utf8');
      const stateData = JSON.parse(stateContent);
      
      // Look for ServerlessDeploymentBucket in the state
      const searchForBucket = (obj) => {
        if (typeof obj !== 'object' || obj === null) return null;
        
        for (const [key, value] of Object.entries(obj)) {
          if (key === 'ServerlessDeploymentBucket' && typeof value === 'string') {
            return value;
          }
          if (typeof value === 'object') {
            const result = searchForBucket(value);
            if (result) return result;
          }
        }
        return null;
      };
      
      const bucketName = searchForBucket(stateData);
      if (bucketName) {
        log(`Found serverless bucket from state file: ${bucketName}`);
        return bucketName;
      }
    } catch (err) {
      warn(`Failed to parse serverless state file: ${err.message}`);
    }
  } else {
    log('No serverless state file found');
  }
  
  // Try to list buckets with serverless prefix
  log('Searching for serverless buckets via AWS API...');
  try {
    const result = runCommand(
      `aws s3api list-buckets --query "Buckets[?starts_with(Name, 'serverless-frc-challenge-api-${config.environment}-')].Name" --output text --region ${config.awsRegion}`,
      { silent: true }
    );
    
    const bucketName = result.trim().split('\n')[0];
    if (bucketName && bucketName !== 'None' && bucketName !== '') {
      log(`Found serverless bucket from AWS: ${bucketName}`);
      return bucketName;
    }
  } catch (err) {
    error('Failed to list S3 buckets. Check your AWS credentials and permissions.');
    throw err;
  }
  
  // Try broader search pattern
  log('Trying broader search pattern...');
  try {
    const result = runCommand(
      `aws s3api list-buckets --query "Buckets[?starts_with(Name, 'serverless-')].Name" --output text --region ${config.awsRegion}`,
      { silent: true }
    );
    
    const buckets = result.trim().split('\n').filter(name => name.includes('frc-challenge-api'));
    if (buckets.length > 0 && buckets[0] !== 'None') {
      log(`Found serverless bucket with broader search: ${buckets[0]}`);
      return buckets[0];
    }
  } catch (err) {
    warn(`Broader search failed: ${err.message}`);
  }
  
  // No bucket found
  const errorMsg = [
    'Could not find Serverless deployment bucket for ALB access logs.',
    'This usually means:',
    '  1. The Lambda functions haven\'t been deployed yet (run: cd lambda && npm run deploy:dev)',
    '  2. The serverless bucket was created in a different region',
    '  3. The bucket naming pattern has changed',
    '',
    'To fix this, either:',
    '  - Deploy the Lambda functions first to create the serverless bucket',
    '  - Or modify the infrastructure to create a dedicated ALB logs bucket'
  ];
  
  errorMsg.forEach(line => error(line));
  throw new Error('Serverless deployment bucket not found');
}

// Function to update bucket policy for ALB access logs
async function updateBucketPolicyForALB(bucketName) {
  if (!bucketName) return;

  log('Updating bucket policy to allow ALB access logs...');

  // Get existing bucket policy if it exists
  let existingPolicy = null;
  try {
    const result = runCommand(`aws s3api get-bucket-policy --bucket "${bucketName}" --region ${config.awsRegion}`, { silent: true });
    existingPolicy = JSON.parse(JSON.parse(result).Policy);
    log('Found existing bucket policy');
  } catch (err) {
    log('No existing bucket policy found, creating new one');
  }

  // Create ALB access log statements
  const albStatements = [
    {
      Sid: 'ALBAccessLogsWrite',
      Effect: 'Allow',
      Principal: {
        AWS: 'arn:aws:iam::033677994240:root'
      },
      Action: 's3:PutObject',
      Resource: `arn:aws:s3:::${bucketName}/alb-logs/*`
    },
    {
      Sid: 'ALBAccessLogsAclCheck',
      Effect: 'Allow',
      Principal: {
        AWS: 'arn:aws:iam::033677994240:root'
      },
      Action: 's3:GetBucketAcl',
      Resource: `arn:aws:s3:::${bucketName}`
    }
  ];

  // Merge with existing policy or create new one
  let policy;
  if (existingPolicy) {
    // Remove any existing ALB statements and add new ones
    const filteredStatements = existingPolicy.Statement.filter(stmt =>
      !stmt.Sid || (!stmt.Sid.includes('ALBAccessLogs'))
    );
    policy = {
      Version: existingPolicy.Version || '2012-10-17',
      Statement: [...filteredStatements, ...albStatements]
    };
  } else {
    policy = {
      Version: '2012-10-17',
      Statement: albStatements
    };
  }
  
  const policyFile = path.join(os.tmpdir(), 'bucket-policy.json');
  log(`Writing policy to: ${policyFile}`);
  fs.writeFileSync(policyFile, JSON.stringify(policy, null, 2));
  log('Policy file written successfully');

  try {
    runCommand(`aws s3api put-bucket-policy --bucket "${bucketName}" --policy file://${policyFile} --region ${config.awsRegion}`);
    log('Updated bucket policy for ALB access logs');
  } catch (err) {
    warn('Failed to update bucket policy - ALB access logs may not work');
    throw err;
  } finally {
    // Clean up
    if (fs.existsSync(policyFile)) {
      fs.unlinkSync(policyFile);
    }
  }
}

// Setup ECR repository
async function setupECR() {
  log('Setting up ECR repository...');

  const repositoryName = 'frc-challenge-runtime';
  const awsAccountId = runCommand('aws sts get-caller-identity --query Account --output text', { silent: true }).trim();
  const repositoryUri = `${awsAccountId}.dkr.ecr.${config.awsRegion}.amazonaws.com/${repositoryName}`;

  try {
    // Check if repository already exists
    try {
      runCommand(`aws ecr describe-repositories --repository-names ${repositoryName} --region ${config.awsRegion}`, { silent: true });
      warn(`Repository ${repositoryName} already exists`);
    } catch (err) {
      // Repository doesn't exist, create it
      log(`Creating repository ${repositoryName}...`);
      runCommand(
        `aws ecr create-repository ` +
        `--repository-name ${repositoryName} ` +
        `--region ${config.awsRegion} ` +
        `--image-scanning-configuration scanOnPush=true ` +
        `--encryption-configuration encryptionType=AES256`
      );
    }

    // Set lifecycle policy
    log('Setting lifecycle policy...');
    const lifecyclePolicy = {
      rules: [
        {
          rulePriority: 1,
          description: "Keep last 10 production images",
          selection: {
            tagStatus: "tagged",
            tagPrefixList: ["latest", "prod", "v"],
            countType: "imageCountMoreThan",
            countNumber: 10
          },
          action: { type: "expire" }
        },
        {
          rulePriority: 2,
          description: "Keep last 5 development images",
          selection: {
            tagStatus: "tagged",
            tagPrefixList: ["dev", "staging"],
            countType: "imageCountMoreThan",
            countNumber: 5
          },
          action: { type: "expire" }
        },
        {
          rulePriority: 3,
          description: "Delete untagged images older than 1 day",
          selection: {
            tagStatus: "untagged",
            countType: "sinceImagePushed",
            countUnit: "days",
            countNumber: 1
          },
          action: { type: "expire" }
        }
      ]
    };

    const lifecyclePolicyPath = path.join(os.tmpdir(), 'lifecycle-policy.json');
    fs.writeFileSync(lifecyclePolicyPath, JSON.stringify(lifecyclePolicy, null, 2));

    runCommand(
      `aws ecr put-lifecycle-policy ` +
      `--repository-name ${repositoryName} ` +
      `--region ${config.awsRegion} ` +
      `--lifecycle-policy-text file://${lifecyclePolicyPath}`
    );

    // Set repository policy
    log('Setting repository policy...');
    const repositoryPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "AllowPushPull",
          Effect: "Allow",
          Principal: {
            AWS: [`arn:aws:iam::${awsAccountId}:root`]
          },
          Action: [
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
    };

    const repositoryPolicyPath = path.join(os.tmpdir(), 'repository-policy.json');
    fs.writeFileSync(repositoryPolicyPath, JSON.stringify(repositoryPolicy, null, 2));

    runCommand(
      `aws ecr set-repository-policy ` +
      `--repository-name ${repositoryName} ` +
      `--region ${config.awsRegion} ` +
      `--policy-text file://${repositoryPolicyPath}`
    );

    // Clean up temp files
    if (fs.existsSync(lifecyclePolicyPath)) fs.unlinkSync(lifecyclePolicyPath);
    if (fs.existsSync(repositoryPolicyPath)) fs.unlinkSync(repositoryPolicyPath);

    // Create environment file
    const ecrEnvPath = path.join('ecr', '.env.ecr');
    const ecrEnvContent = `# ECR Configuration
AWS_ACCOUNT_ID=${awsAccountId}
AWS_REGION=${config.awsRegion}
REPOSITORY_NAME=${repositoryName}
REPOSITORY_URI=${repositoryUri}
`;

    // Ensure ecr directory exists
    if (!fs.existsSync('ecr')) {
      fs.mkdirSync('ecr', { recursive: true });
    }

    fs.writeFileSync(ecrEnvPath, ecrEnvContent);

    log('✅ ECR repository created successfully!');
    log(`Repository URI: ${repositoryUri}`);
    log('Environment configuration saved to ecr/.env.ecr');

  } catch (err) {
    error('Failed to setup ECR repository');
    throw err;
  }
}

// Build and push container
async function buildContainer() {
  log('🚀 Building and pushing container image...');

  const dockerContext = 'docker';
  const dockerfile = 'Dockerfile';
  const imageTag = 'latest';

  try {
    // Check if .env.ecr exists
    const ecrEnvPath = path.join('ecr', '.env.ecr');
    if (!fs.existsSync(ecrEnvPath)) {
      error('.env.ecr file not found. Run ECR setup first.');
      throw new Error('ECR environment file missing');
    }

    // Read ECR environment variables
    const ecrEnvContent = fs.readFileSync(ecrEnvPath, 'utf8');
    const ecrVars = {};
    ecrEnvContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        ecrVars[key.trim()] = value.trim();
      }
    });

    const { AWS_ACCOUNT_ID, AWS_REGION, REPOSITORY_NAME, REPOSITORY_URI } = ecrVars;

    // Validate required variables
    if (!AWS_ACCOUNT_ID || !AWS_REGION || !REPOSITORY_NAME || !REPOSITORY_URI) {
      error('Missing required environment variables in .env.ecr');
      throw new Error('Invalid ECR configuration');
    }

    // Check if Docker context exists
    if (!fs.existsSync(dockerContext)) {
      error(`Docker context directory not found: ${dockerContext}`);
      throw new Error('Docker context missing');
    }

    // Check if Dockerfile exists
    const dockerfilePath = path.join(dockerContext, dockerfile);
    if (!fs.existsSync(dockerfilePath)) {
      error(`Dockerfile not found: ${dockerfilePath}`);
      throw new Error('Dockerfile missing');
    }

    log('Configuration:');
    log(`  AWS Account ID: ${AWS_ACCOUNT_ID}`);
    log(`  AWS Region: ${AWS_REGION}`);
    log(`  Repository: ${REPOSITORY_NAME}`);
    log(`  Repository URI: ${REPOSITORY_URI}`);
    log(`  Docker Context: ${dockerContext}`);
    log(`  Dockerfile: ${dockerfile}`);
    log(`  Image Tag: ${imageTag}`);

    // Authenticate Docker to ECR
    log('🔐 Authenticating Docker to ECR...');
    const loginPassword = runCommand(`aws ecr get-login-password --region ${AWS_REGION}`, { silent: true });
    runCommand(`echo ${loginPassword.trim()} | docker login --username AWS --password-stdin ${REPOSITORY_URI}`);

    // Build the Docker image
    log('🔨 Building Docker image...');
    const originalDir = process.cwd();
    process.chdir(dockerContext);

    try {
      runCommand(`docker build -t ${REPOSITORY_NAME}:${imageTag} -f ${dockerfile} .`);

      // Tag the image for ECR
      log('🏷️  Tagging image for ECR...');
      runCommand(`docker tag ${REPOSITORY_NAME}:${imageTag} ${REPOSITORY_URI}:${imageTag}`);

      // Push the image to ECR
      log('📤 Pushing image to ECR...');
      runCommand(`docker push ${REPOSITORY_URI}:${imageTag}`);

      // Get image information
      log('Getting image information...');
      const imageDetails = runCommand(
        `aws ecr describe-images --repository-name ${REPOSITORY_NAME} --image-ids imageTag=${imageTag} --region ${AWS_REGION} --query 'imageDetails[0]' --output json`,
        { silent: true }
      );

      const imageInfo = JSON.parse(imageDetails);
      const imageSizeMB = Math.round(imageInfo.imageSizeInBytes / 1024 / 1024);

      log('✅ Image pushed successfully!');
      log(`Image URI: ${REPOSITORY_URI}:${imageTag}`);
      log(`Image Digest: ${imageInfo.imageDigest}`);
      log(`Image Size: ${imageSizeMB} MB`);

      // Update environment file with latest image info
      const buildInfo = `
# Latest Build Information
LATEST_IMAGE_TAG=${imageTag}
LATEST_IMAGE_URI=${REPOSITORY_URI}:${imageTag}
LATEST_IMAGE_DIGEST=${imageInfo.imageDigest}
BUILD_TIMESTAMP=${new Date().toISOString()}
`;

      fs.appendFileSync(path.join('..', ecrEnvPath), buildInfo);
      log('📝 Build information updated in .env.ecr');

    } finally {
      process.chdir(originalDir);
    }

    log('🎉 Build and push completed successfully!');

  } catch (err) {
    error('Failed to build and push container');
    throw err;
  }
}

// Register ECS task definition
async function registerTaskDefinition() {
  log('Registering ECS task definition...');

  try {
    // Get AWS account ID
    const awsAccountId = runCommand('aws sts get-caller-identity --query Account --output text', { silent: true }).trim();

    // Source ECR variables
    const ecrEnvPath = path.join('ecr', '.env.ecr');
    if (!fs.existsSync(ecrEnvPath)) {
      error('ECR environment file not found');
      throw new Error('ECR environment file missing');
    }

    // Read ECR environment variables
    const ecrEnvContent = fs.readFileSync(ecrEnvPath, 'utf8');
    const ecrVars = {};
    ecrEnvContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        ecrVars[key.trim()] = value.trim();
      }
    });

    // Read and process task definition template
    const taskDefTemplatePath = path.join('ecs', 'container-definitions.json');
    if (!fs.existsSync(taskDefTemplatePath)) {
      error('Task definition template not found');
      throw new Error('Task definition template missing');
    }

    const taskDefTemplate = fs.readFileSync(taskDefTemplatePath, 'utf8');
    const processedTaskDef = taskDefTemplate
      .replace(/\${AWS_ACCOUNT_ID}/g, awsAccountId)
      .replace(/\${AWS_REGION}/g, config.awsRegion)
      .replace(/\${ENVIRONMENT}/g, config.environment);

    // Write processed task definition
    const tempTaskDefPath = path.join(os.tmpdir(), 'processed-task-definition.json');
    fs.writeFileSync(tempTaskDefPath, processedTaskDef);

    // Register task definition
    runCommand(
      `aws ecs register-task-definition ` +
      `--family frc-challenge-runtime ` +
      `--network-mode awsvpc ` +
      `--requires-compatibilities FARGATE ` +
      `--cpu 2048 ` +
      `--memory 4096 ` +
      `--execution-role-arn arn:aws:iam::${awsAccountId}:role/ecsTaskExecutionRole ` +
      `--task-role-arn arn:aws:iam::${awsAccountId}:role/ecsTaskRole ` +
      `--container-definitions file://${tempTaskDefPath} ` +
      `--region ${config.awsRegion}`
    );

    // Clean up temp file
    if (fs.existsSync(tempTaskDefPath)) {
      fs.unlinkSync(tempTaskDefPath);
    }

    log('✅ ECS task definition registered successfully');
  } catch (err) {
    error('Failed to register task definition');
    throw err;
  }
}

// Deploy Lambda functions
async function deployLambda() {
  log('Deploying Lambda functions...');

  process.chdir('../lambda');

  try {
    // Install dependencies
    log('Installing Lambda dependencies...');
    runCommand('npm install');

    // Deploy with serverless
    log('Deploying with Serverless Framework...');
    runCommand(`npm run deploy:${config.environment}`);

    log('Lambda deployment completed');
  } catch (err) {
    error('Failed to deploy Lambda functions');
    throw err;
  }

  process.chdir('../infrastructure');
}

// Deploy infrastructure
async function deployInfrastructure() {
  log('Deploying ECS cluster infrastructure...');

  process.chdir('ecs');

  let serverlessBucket;
  try {
    serverlessBucket = await getServerlessBucket();
    log(`Found bucket: '${serverlessBucket}'`);

    if (serverlessBucket) {
      await updateBucketPolicyForALB(serverlessBucket);
    }
  } catch (err) {
    error('Failed to find or configure serverless bucket');
    throw err;
  }

  // Prepare parameter overrides
  let paramOverrides = `Environment=${config.environment} ProjectName=${config.projectName}`;
  if (serverlessBucket) {
    paramOverrides += ` ServerlessDeploymentBucketName=${serverlessBucket}`;
    log(`ALB access logs will be enabled using bucket: ${serverlessBucket}`);
  } else {
    log('ALB access logs will be disabled (no serverless bucket found)');
  }

  // Deploy CloudFormation stack
  const stackName = `${config.projectName}-${config.environment}-infrastructure`;
  runCommand(
    `aws cloudformation deploy ` +
    `--template-file cluster-infrastructure.yaml ` +
    `--stack-name "${stackName}" ` +
    `--parameter-overrides ${paramOverrides} ` +
    `--capabilities CAPABILITY_IAM ` +
    `--region ${config.awsRegion}`
  );

  log('Infrastructure deployment completed');

  if (serverlessBucket) {
    log('ALB access logs are enabled and will appear in S3 within 5-60 minutes of traffic');
    log(`View logs at: https://s3.console.aws.amazon.com/s3/buckets/${serverlessBucket}?prefix=alb-logs/`);
  }

  process.chdir('..');
}

// Main function
async function main() {
  const command = process.argv[2];

  if (!command) {
    console.log('Usage: node deploy.js <command>');
    console.log('Commands:');
    console.log('  infrastructure - Deploy ECS cluster infrastructure only');
    console.log('  ecr           - Setup ECR repository only');
    console.log('  container     - Build and push container image only');
    console.log('  task-def      - Register ECS task definition only');
    console.log('  lambda        - Deploy Lambda functions only');
    console.log('  all           - Deploy everything (full deployment)');
    process.exit(1);
  }

  try {
    log(`Starting FRC Challenge Site deployment for environment: ${config.environment}`);
    log(`Region: ${config.awsRegion}`);

    checkPrerequisites();

    switch (command) {
      case 'infrastructure':
        await deployInfrastructure();
        break;
      case 'ecr':
        await setupECR();
        break;
      case 'container':
        await buildContainer();
        await registerTaskDefinition();
        break;
      case 'task-def':
        await registerTaskDefinition();
        break;
      case 'lambda':
        await deployLambda();
        break;
      case 'all':
        log('🚀 Starting full deployment...');
        await deployInfrastructure();
        await setupECR();
        await buildContainer();
        await registerTaskDefinition();
        await deployLambda();

        // Output deployment summary
        log('\n📋 Deployment Summary:');
        log(`• ECS Cluster: ${config.projectName}-${config.environment}-cluster`);
        log('• Task Definition: frc-challenge-runtime');
        log('• Lambda functions deployed');
        log('• Infrastructure ready for challenge sessions');
        break;
      default:
        error(`Unknown command: ${command}`);
        process.exit(1);
    }

    log('🎉 Deployment completed successfully!');

  } catch (err) {
    error(`Deployment failed: ${err.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  deployInfrastructure,
  setupECR,
  buildContainer,
  registerTaskDefinition,
  deployLambda,
  getServerlessBucket
};
