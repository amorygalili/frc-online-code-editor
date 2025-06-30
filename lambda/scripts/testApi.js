#!/usr/bin/env node

/**
 * FRC Challenge Platform API Testing Script
 *
 * This script tests all the Lambda API endpoints for the FRC Challenge Platform.
 * It dynamically gets the API Gateway URL from serverless deployment info
 * and accepts the JWT token as a command line argument.
 *
 * Usage:
 *   npm run test:api -- --token YOUR_JWT_TOKEN
 *   node scripts/testApi.js --token YOUR_JWT_TOKEN
 *   node scripts/testApi.js --token YOUR_JWT_TOKEN --verbose
 *
 * Options:
 *   --token, -t    JWT token from Cognito authentication (required)
 *   --verbose, -v  Enable verbose HTTP request/response logging
 *   --help, -h     Show help message
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    jwtToken: '',
    verbose: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--token':
      case '-t':
        config.jwtToken = args[++i];
        break;
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--help':
      case '-h':
        config.help = true;
        break;
      default:
        if (arg.startsWith('--token=')) {
          config.jwtToken = arg.split('=')[1];
        } else if (!arg.startsWith('-')) {
          // Assume it's a token if no flag is provided
          config.jwtToken = arg;
        }
        break;
    }
  }

  return config;
}

// Get API Gateway URL from serverless info
function getApiGatewayUrl() {
  try {
    log('🔍 Getting API Gateway URL from serverless deployment...', colors.cyan);

    const result = execSync('npm run info', {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Parse the output to find the API Gateway URL
    const lines = result.split('\n');
    for (const line of lines) {
      // Look for endpoint lines like "GET - https://..."
      if (line.trim().match(/^(GET|POST|PUT|DELETE) - https:\/\/.*\.execute-api\./)) {
        const match = line.match(/https:\/\/[a-zA-Z0-9]+\.execute-api\.[a-zA-Z0-9-]+\.amazonaws\.com\/[a-zA-Z0-9]+/);
        if (match) {
          const baseUrl = match[0];
          logSuccess(`Found API Gateway URL: ${baseUrl}`);
          return baseUrl;
        }
      }
    }

    throw new Error('Could not parse API Gateway URL from serverless info output');
  } catch (error) {
    logError(`Failed to get API Gateway URL: ${error.message}`);
    logInfo('Make sure your Lambda functions are deployed with: npm run deploy:dev');
    throw error;
  }
}

// Configuration
let config = {
  baseURL: '',
  jwtToken: '',
  timeout: 30000,
  verbose: false
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// HTTP client setup
const apiClient = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': config.jwtToken ? `Bearer ${config.jwtToken}` : ''
  }
});

// Add request/response interceptors for debugging
if (config.verbose) {
  apiClient.interceptors.request.use(request => {
    log(`🔄 ${request.method?.toUpperCase()} ${request.url}`, colors.cyan);
    if (request.data) {
      log(`📤 Request Body: ${JSON.stringify(request.data, null, 2)}`, colors.cyan);
    }
    return request;
  });

  apiClient.interceptors.response.use(
    response => {
      log(`📥 Response ${response.status}: ${JSON.stringify(response.data, null, 2)}`, colors.cyan);
      return response;
    },
    error => {
      if (error.response) {
        log(`📥 Error Response ${error.response.status}: ${JSON.stringify(error.response.data, null, 2)}`, colors.red);
      }
      return Promise.reject(error);
    }
  );
}

// Test helper functions
async function runTest(testName, testFunction) {
  log(`\n🧪 Running test: ${testName}`, colors.bright);
  
  try {
    const result = await testFunction();
    testResults.passed++;
    testResults.tests.push({ name: testName, status: 'PASSED', result });
    logSuccess(`Test passed: ${testName}`);
    return result;
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ 
      name: testName, 
      status: 'FAILED', 
      error: error.message,
      details: error.response?.data || error.stack
    });
    logError(`Test failed: ${testName} - ${error.message}`);
    if (config.verbose && error.response?.data) {
      log(`Error details: ${JSON.stringify(error.response.data, null, 2)}`, colors.red);
    }
    throw error;
  }
}

function skipTest(testName, reason) {
  testResults.skipped++;
  testResults.tests.push({ name: testName, status: 'SKIPPED', reason });
  logWarning(`Test skipped: ${testName} - ${reason}`);
}

// Test functions
async function testGetChallenges() {
  const response = await apiClient.get('/challenges');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success flag is false');
  }
  
  const { challenges, total, hasMore } = response.data.data;
  
  if (!Array.isArray(challenges)) {
    throw new Error('Challenges should be an array');
  }
  
  if (typeof total !== 'number') {
    throw new Error('Total should be a number');
  }
  
  if (typeof hasMore !== 'boolean') {
    throw new Error('HasMore should be a boolean');
  }
  
  logInfo(`Found ${challenges.length} challenges (total: ${total})`);
  return { challenges, total, hasMore };
}

async function testGetChallengesWithFilters() {
  const params = {
    category: 'Basics',
    difficulty: 'Beginner',
    limit: 5
  };
  
  const response = await apiClient.get('/challenges', { params });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  const { challenges } = response.data.data;
  
  // Verify filtering worked (if there are challenges)
  if (challenges.length > 0) {
    const firstChallenge = challenges[0];
    if (firstChallenge.category !== params.category) {
      logWarning(`Filter may not be working: expected category ${params.category}, got ${firstChallenge.category}`);
    }
    if (firstChallenge.difficulty !== params.difficulty) {
      logWarning(`Filter may not be working: expected difficulty ${params.difficulty}, got ${firstChallenge.difficulty}`);
    }
  }
  
  logInfo(`Found ${challenges.length} filtered challenges`);
  return { challenges, params };
}

async function testGetChallenge(challengeId) {
  if (!challengeId) {
    throw new Error('Challenge ID is required');
  }
  
  const response = await apiClient.get(`/challenges/${challengeId}`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success flag is false');
  }
  
  const challenge = response.data.data;
  
  if (!challenge.id || challenge.id !== challengeId) {
    throw new Error(`Challenge ID mismatch: expected ${challengeId}, got ${challenge.id}`);
  }
  
  // Verify required fields
  const requiredFields = ['title', 'description', 'difficulty', 'category'];
  for (const field of requiredFields) {
    if (!challenge[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  logInfo(`Retrieved challenge: ${challenge.title}`);
  return challenge;
}

async function testGetUserProgress() {
  const response = await apiClient.get('/user/progress');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success flag is false');
  }
  
  const { progress, summary } = response.data.data;
  
  if (!Array.isArray(progress)) {
    throw new Error('Progress should be an array');
  }
  
  if (!summary || typeof summary !== 'object') {
    throw new Error('Summary should be an object');
  }
  
  // Verify summary structure
  const summaryFields = ['totalChallenges', 'completedChallenges', 'inProgressChallenges'];
  for (const field of summaryFields) {
    if (typeof summary[field] !== 'number') {
      throw new Error(`Summary field ${field} should be a number`);
    }
  }
  
  logInfo(`User has progress on ${progress.length} challenges`);
  logInfo(`Summary: ${summary.completedChallenges}/${summary.totalChallenges} completed`);
  return { progress, summary };
}

async function testCreateChallengeSession(challengeId) {
  if (!challengeId) {
    throw new Error('Challenge ID is required');
  }
  
  const response = await apiClient.post(`/challenges/${challengeId}/sessions`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success flag is false');
  }
  
  const session = response.data.data;
  
  // Verify session structure
  const requiredFields = ['sessionId', 'userId', 'challengeId', 'status', 'startedAt'];
  for (const field of requiredFields) {
    if (!session[field]) {
      throw new Error(`Missing required session field: ${field}`);
    }
  }
  
  if (session.challengeId !== challengeId) {
    throw new Error(`Session challenge ID mismatch: expected ${challengeId}, got ${session.challengeId}`);
  }
  
  if (session.status !== 'active') {
    throw new Error(`Expected session status 'active', got ${session.status}`);
  }
  
  logInfo(`Created session: ${session.sessionId}`);
  return session;
}

async function testSaveChallengeCode(sessionId, code = '// Test code\npublic class Robot {}') {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }
  
  const requestBody = { code };
  const response = await apiClient.put(`/sessions/${sessionId}/code`, requestBody);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Response success flag is false');
  }
  
  const updatedSession = response.data.data;
  
  if (updatedSession.currentCode !== code) {
    throw new Error('Code was not saved correctly');
  }
  
  if (!updatedSession.lastSavedAt) {
    throw new Error('lastSavedAt should be updated');
  }
  
  logInfo(`Saved code to session: ${sessionId}`);
  return updatedSession;
}

// Show help message
function showHelp() {
  console.log(`
FRC Challenge Platform API Testing Script

Usage:
  npm run test:api -- --token YOUR_JWT_TOKEN
  node scripts/testApi.js --token YOUR_JWT_TOKEN
  node scripts/testApi.js --token YOUR_JWT_TOKEN --verbose

Options:
  --token, -t    JWT token from Cognito authentication (required)
  --verbose, -v  Enable verbose HTTP request/response logging
  --help, -h     Show this help message

Examples:
  npm run test:api -- --token eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
  node scripts/testApi.js -t eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9... -v

Getting a JWT Token:
  1. Open your frontend application in a browser
  2. Log in with your Google account
  3. Open browser dev tools (F12)
  4. Go to Application/Storage > Local Storage
  5. Find key starting with "CognitoIdentityServiceProvider"
  6. Look for the ".idToken" key and copy its value
  `);
}

// Main test runner
async function runAllTests() {
  // Parse command line arguments
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Update config with parsed arguments
  config.jwtToken = args.jwtToken;
  config.verbose = args.verbose;

  // Get API Gateway URL dynamically
  try {
    config.baseURL = getApiGatewayUrl();
  } catch (error) {
    process.exit(1);
  }

  log('🚀 Starting FRC Challenge Platform API Tests', colors.bright);
  log(`📍 Base URL: ${config.baseURL}`, colors.blue);
  log(`🔑 JWT Token: ${config.jwtToken ? 'Provided' : 'Missing'}`, config.jwtToken ? colors.green : colors.red);

  if (!config.jwtToken) {
    logError('JWT token is required for API testing.');
    logInfo('Use --token flag to provide your JWT token:');
    logInfo('  npm run test:api -- --token YOUR_JWT_TOKEN');
    logInfo('  node scripts/testApi.js --token YOUR_JWT_TOKEN');
    logInfo('');
    logInfo('Run with --help for more information on getting a JWT token.');
    process.exit(1);
  }
  
  let challengeId = null;
  let sessionId = null;
  
  try {
    // Test 1: Get challenges list
    const challengesResult = await runTest('Get Challenges List', testGetChallenges);
    if (challengesResult.challenges.length > 0) {
      challengeId = challengesResult.challenges[0].id;
      logInfo(`Using challenge ID for subsequent tests: ${challengeId}`);
    }
    
    // Test 2: Get challenges with filters
    await runTest('Get Challenges with Filters', testGetChallengesWithFilters);
    
    // Test 3: Get specific challenge (if we have a challenge ID)
    if (challengeId) {
      await runTest('Get Specific Challenge', () => testGetChallenge(challengeId));
    } else {
      skipTest('Get Specific Challenge', 'No challenge ID available');
    }
    
    // Test 4: Get user progress
    await runTest('Get User Progress', testGetUserProgress);
    
    // Test 5: Create challenge session (if we have a challenge ID)
    if (challengeId) {
      const sessionResult = await runTest('Create Challenge Session', () => testCreateChallengeSession(challengeId));
      sessionId = sessionResult.sessionId;
    } else {
      skipTest('Create Challenge Session', 'No challenge ID available');
    }
    
    // Test 6: Save challenge code (if we have a session ID)
    if (sessionId) {
      await runTest('Save Challenge Code', () => testSaveChallengeCode(sessionId));
    } else {
      skipTest('Save Challenge Code', 'No session ID available');
    }
    
  } catch (error) {
    // Individual test failures are already logged
  }
  
  // Print summary
  log('\n📊 Test Results Summary', colors.bright);
  log(`✅ Passed: ${testResults.passed}`, colors.green);
  log(`❌ Failed: ${testResults.failed}`, colors.red);
  log(`⚠️  Skipped: ${testResults.skipped}`, colors.yellow);
  log(`📝 Total: ${testResults.tests.length}`, colors.blue);
  
  // Save detailed results to file
  const resultsFile = path.join(__dirname, '..', 'test-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: {
      baseURL: config.baseURL,
      hasJwtToken: !!config.jwtToken
    },
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      total: testResults.tests.length
    },
    tests: testResults.tests
  }, null, 2));
  
  log(`\n📄 Detailed results saved to: ${resultsFile}`, colors.blue);
  
  // Exit with appropriate code
  if (testResults.failed > 0) {
    log('\n❌ Some tests failed!', colors.red);
    process.exit(1);
  } else {
    log('\n🎉 All tests passed!', colors.green);
    process.exit(0);
  }
}

// Handle command line execution
if (require.main === module) {
  // Run the tests
  runAllTests().catch(error => {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testGetChallenges,
  testGetChallenge,
  testGetUserProgress,
  testCreateChallengeSession,
  testSaveChallengeCode
};
