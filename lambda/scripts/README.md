# API Testing Script

This directory contains the API testing script for the FRC Challenge Platform Lambda API endpoints.

## 🧪 testApi.js

A comprehensive Node.js script that dynamically tests all deployed Lambda API endpoints including:

- **Challenge Management**
  - `GET /challenges` - List challenges with filtering and pagination
  - `GET /challenges/{id}` - Get individual challenge details

- **User Progress**
  - `GET /user/progress` - Get user's progress across all challenges

- **Challenge Sessions**
  - `POST /challenges/{id}/sessions` - Create a new challenge session
  - `PUT /sessions/{sessionId}/code` - Save code progress in a session

### Features

- ✅ **Dynamic API Discovery**: Automatically gets API Gateway URL from serverless deployment
- 🔍 **Comprehensive Testing**: Tests all endpoints with response validation and structure checking
- 📊 **Detailed Reporting**: Test results summary and JSON export
- 🎨 **Colored Output**: Easy-to-read console output with status indicators
- 🔧 **Verbose Mode**: Optional detailed HTTP request/response logging
- ⚡ **Smart Dependencies**: Uses results from one test in subsequent tests
- 🚀 **Zero Configuration**: No environment files needed

### Usage

```bash
# Run API tests with JWT token
npm run test:api -- --token YOUR_JWT_TOKEN

# Run with verbose HTTP logging
npm run test:api -- --token YOUR_JWT_TOKEN --verbose

# Direct execution
node scripts/testApi.js --token YOUR_JWT_TOKEN

# Show help
npm run test:api -- --help
```

### Command Line Options

- `--token, -t` - JWT token from Cognito authentication (required)
- `--verbose, -v` - Enable verbose HTTP request/response logging
- `--help, -h` - Show help message with token instructions

## 🚀 Quick Start Guide

1. **Deploy your Lambda functions** (if not already deployed):
   ```bash
   npm run deploy:dev
   ```

2. **Get a JWT token**:
   - Open your frontend application in a browser
   - Log in with your Google account
   - Open browser dev tools (F12)
   - Go to Application/Storage > Local Storage
   - Find the key starting with "CognitoIdentityServiceProvider"
   - Look for the ".idToken" key and copy its value

3. **Run the tests**:
   ```bash
   npm run test:api -- --token YOUR_JWT_TOKEN_HERE
   ```

## 📊 Test Results

Test results are displayed in the console with colored output:
- ✅ Green for passed tests
- ❌ Red for failed tests  
- ⚠️ Yellow for skipped tests
- ℹ️ Blue for informational messages

Detailed results are also saved to `test-results.json` with:
- Timestamp of test run
- Configuration used
- Summary statistics
- Individual test results with error details

## 🔍 Troubleshooting

### Common Issues

**"JWT token is required"**
- Make sure you've set the `JWT_TOKEN` environment variable
- Ensure the token is valid and not expired
- Get a fresh token from the frontend application

**"Network Error" or timeout**
- Check that your API Gateway URL is correct
- Verify your Lambda functions are deployed
- Check AWS credentials and permissions

**"Challenge ID not found"**
- Make sure you've seeded the database with sample data:
  ```bash
  npm run seed
  ```

**Tests are skipped**
- Some tests depend on previous tests (e.g., need a challenge ID to create a session)
- If early tests fail, later tests may be skipped
- Check the test output for the root cause

### Debug Mode

Run tests with verbose logging to see detailed HTTP requests and responses:

```bash
npm run test:api -- --token YOUR_JWT_TOKEN --verbose
```

This will show:
- 🔄 Outgoing HTTP requests with method and URL
- 📤 Request bodies (for POST/PUT requests)
- 📥 Response bodies and status codes
- 📥 Error response details

## 🔐 Security Notes

- JWT tokens are sensitive - don't commit them to version control or share them
- Tokens expire periodically and need to be refreshed from the frontend
- Only use test/development tokens, never production tokens for testing
- Pass tokens via command line arguments, not environment files

## 📝 Extending the Tests

To add new test cases:

1. Add a new test function following the existing pattern:
   ```javascript
   async function testNewEndpoint() {
     const response = await apiClient.get('/new-endpoint');
     // Add validation logic
     return response.data;
   }
   ```

2. Add the test to the main test runner:
   ```javascript
   await runTest('Test New Endpoint', testNewEndpoint);
   ```

3. Export the function if you want to use it standalone:
   ```javascript
   module.exports = {
     // ... existing exports
     testNewEndpoint
   };
   ```
