// Test Page - For testing API endpoints and session management
import React, { useState, useEffect } from 'react';
import { challengeService, ChallengeSession } from '../services/challengeService';
import { sessionService } from '../services/sessionService';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

export const TestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ChallengeSession[]>([]);

  // Add test result
  const addTestResult = (test: string, status: 'success' | 'error', message: string, data?: any) => {
    setTestResults(prev => [...prev, { test, status, message, data }]);
  };

  // Update test result
  const updateTestResult = (test: string, status: 'success' | 'error', message: string, data?: any) => {
    setTestResults(prev => prev.map(result => 
      result.test === test ? { ...result, status, message, data } : result
    ));
  };

  // Run API tests
  const runApiTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: List Challenges
    setTestResults([{ test: 'List Challenges', status: 'pending', message: 'Testing...' }]);
    try {
      const challenges = await challengeService.getChallenges();
      updateTestResult('List Challenges', 'success', `Found ${challenges.length} challenges`, challenges);
    } catch (error) {
      updateTestResult('List Challenges', 'error', `Error: ${(error as Error).message}`);
    }

    // Test 2: Get User Progress
    addTestResult('Get User Progress', 'pending', 'Testing...');
    try {
      const progress = await challengeService.getChallengeProgress('1');
      updateTestResult('Get User Progress', 'success', 'Progress retrieved', progress);
    } catch (error) {
      updateTestResult('Get User Progress', 'error', `Error: ${(error as Error).message}`);
    }

    // Test 3: List Sessions
    addTestResult('List Sessions', 'pending', 'Testing...');
    try {
      const sessions = await challengeService.listSessions();
      updateTestResult('List Sessions', 'success', `Found ${sessions.length} sessions`, sessions);
      setActiveSessions(sessions);
    } catch (error) {
      updateTestResult('List Sessions', 'error', `Error: ${(error as Error).message}`);
    }

    setIsRunning(false);
  };

  // Create test session
  const createTestSession = async () => {
    addTestResult('Create Session', 'pending', 'Creating session...');
    try {
      const session = await sessionService.createSession('1', 'basic');
      updateTestResult('Create Session', 'success', `Session created: ${session.sessionId}`, session);
      
      // Refresh sessions list
      const sessions = await challengeService.listSessions();
      setActiveSessions(sessions);
    } catch (error) {
      updateTestResult('Create Session', 'error', `Error: ${(error as Error).message}`);
    }
  };

  // Terminate session
  const terminateSession = async (sessionId: string) => {
    addTestResult(`Terminate ${sessionId}`, 'pending', 'Terminating...');
    try {
      await sessionService.terminateSession(sessionId);
      updateTestResult(`Terminate ${sessionId}`, 'success', 'Session terminated');
      
      // Refresh sessions list
      const sessions = await challengeService.listSessions();
      setActiveSessions(sessions);
    } catch (error) {
      updateTestResult(`Terminate ${sessionId}`, 'error', `Error: ${(error as Error).message}`);
    }
  };

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const sessions = await challengeService.listSessions();
        setActiveSessions(sessions);
      } catch (error) {
        console.error('Failed to load sessions:', error);
      }
    };
    loadSessions();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>API & Session Testing</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runApiTests} 
          disabled={isRunning}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          {isRunning ? 'Running Tests...' : 'Run API Tests'}
        </button>
        
        <button 
          onClick={createTestSession}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Create Test Session
        </button>
      </div>

      {/* Test Results */}
      <div style={{ marginBottom: '30px' }}>
        <h2>Test Results</h2>
        {testResults.length === 0 ? (
          <p>No tests run yet. Click "Run API Tests" to start.</p>
        ) : (
          <div>
            {testResults.map((result, index) => (
              <div 
                key={index}
                style={{ 
                  padding: '10px',
                  margin: '5px 0',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: result.status === 'success' ? '#d4edda' : 
                                 result.status === 'error' ? '#f8d7da' : '#fff3cd'
                }}
              >
                <strong>{result.test}</strong>: {result.message}
                {result.data && (
                  <details style={{ marginTop: '5px' }}>
                    <summary>View Data</summary>
                    <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div>
        <h2>Active Sessions ({activeSessions.length})</h2>
        {activeSessions.length === 0 ? (
          <p>No active sessions</p>
        ) : (
          <div>
            {activeSessions.map(session => (
              <div 
                key={session.sessionId}
                style={{ 
                  padding: '15px',
                  margin: '10px 0',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#f8f9fa'
                }}
              >
                <div><strong>Session ID:</strong> {session.sessionId}</div>
                <div><strong>Challenge ID:</strong> {session.challengeId}</div>
                <div><strong>Status:</strong> 
                  <span style={{ 
                    color: session.status === 'running' ? 'green' : 
                           session.status === 'failed' ? 'red' : 'orange'
                  }}>
                    {session.status}
                  </span>
                </div>
                <div><strong>Resource Profile:</strong> {session.resourceProfile}</div>
                <div><strong>Created:</strong> {new Date(session.createdAt).toLocaleString()}</div>
                
                {session.containerInfo && (
                  <div style={{ marginTop: '10px' }}>
                    <strong>Container Info:</strong>
                    <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                      {session.containerInfo.editorUrl && (
                        <li>
                          <a href={session.containerInfo.editorUrl} target="_blank" rel="noopener noreferrer">
                            Editor URL
                          </a>
                        </li>
                      )}
                      {session.containerInfo.nt4Url && <li>NT4 URL: {session.containerInfo.nt4Url}</li>}
                      {session.containerInfo.halWebSocketUrl && <li>HAL WebSocket: {session.containerInfo.halWebSocketUrl}</li>}
                    </ul>
                  </div>
                )}
                
                <button 
                  onClick={() => terminateSession(session.sessionId)}
                  style={{ 
                    padding: '5px 10px',
                    marginTop: '10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Terminate Session
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
