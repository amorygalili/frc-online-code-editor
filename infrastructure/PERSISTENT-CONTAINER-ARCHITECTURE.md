# Persistent Container Architecture for FRC Challenge Site

## 🎯 Overview

This architecture implements a **one container per user** model where each student gets a persistent container that can be reused across multiple challenges, dramatically improving the user experience.

## 🔄 User Experience Flow

### **Traditional Approach** (What we're replacing):
```
Student → Challenge A → Wait 2-3 min → Code
Student → Challenge B → Wait 2-3 min → Code  
Student → Challenge C → Wait 2-3 min → Code
```
**Total wait time: 6-9 minutes** 😞

### **New Persistent Container Approach**:
```
Student Login → Wait 2-3 min (one time) → Container Ready
Student → Challenge A → Instant load → Code
Student → Challenge B → Exit prompt → Instant load → Code
Student → Challenge C → Exit prompt → Instant load → Code
```
**Total wait time: 2-3 minutes** 😊

## 🏗️ Architecture Changes

### **Session Management Model**

| Aspect | Old Model | New Model |
|--------|-----------|-----------|
| **Container Lifecycle** | Per challenge | Per user |
| **Max Containers** | 3 per user | 1 per user |
| **Challenge Switching** | Create new container | Reuse existing |
| **Startup Time** | Every challenge | One time only |
| **Resource Usage** | Higher (multiple containers) | Lower (single container) |

### **Database Schema Updates**

```sql
-- Updated challenge_sessions table
ALTER TABLE challenge_sessions 
ADD COLUMN current_challenge_id VARCHAR(255),
ADD COLUMN container_type VARCHAR(20) DEFAULT 'persistent';

-- New indexes for efficient queries
CREATE INDEX idx_user_active_containers 
ON challenge_sessions(user_id, status) 
WHERE status IN ('starting', 'running', 'ready');
```

### **Container States**

```
starting → running → ready ⟷ loading_challenge → ready
    ↓         ↓         ↓
  failed   stopped   expired
```

- **starting**: Container is being created
- **running**: Container is ready but no challenge loaded
- **ready**: Container is idle, ready for new challenges
- **loading_challenge**: Switching between challenges
- **stopped**: User explicitly terminated container
- **failed**: Container failed to start or crashed
- **expired**: Container exceeded timeout limits

## 🔧 API Endpoints

### **Create/Resume Session**
```http
POST /sessions
{
  "challengeId": "basic-motor-control"
}
```

**Responses:**
- **201**: New container created (first time)
- **200**: Resuming existing challenge
- **200**: Loading new challenge in existing container
- **409**: Must exit current challenge first

### **Exit Current Challenge**
```http
DELETE /sessions/{sessionId}/challenge
```
Clears current challenge but keeps container running.

### **Switch Challenge** (Alternative to exit + create)
```http
POST /sessions/{sessionId}/switch
{
  "newChallengeId": "autonomous-navigation",
  "saveCurrentWork": true
}
```

### **Terminate Container**
```http
DELETE /sessions/{sessionId}
```
Completely terminates the user's container.

## 🚀 Implementation Details

### **Lambda Functions**

1. **createUserSession.ts** - Handles container creation and challenge loading
2. **exitChallenge.ts** - Exits current challenge, keeps container
3. **switchChallenge.ts** - Direct challenge switching with optional save
4. **terminateSession.ts** - Completely terminates user container

### **Container API Extensions**

The container needs new API endpoints:

```javascript
// In container server.js
app.post('/api/load-challenge', async (req, res) => {
  const { challengeId } = req.body;
  
  // 1. Clear current workspace
  await clearWorkspace();
  
  // 2. Load challenge template from S3/database
  await loadChallengeTemplate(challengeId);
  
  // 3. Initialize project (fast since dependencies are cached)
  await initializeProject();
  
  res.json({ status: 'ready', challengeId });
});

app.post('/api/clear-workspace', async (req, res) => {
  await clearWorkspace();
  res.json({ status: 'cleared' });
});

app.post('/api/save-workspace', async (req, res) => {
  const { challengeId } = req.body;
  const workspaceData = await packageWorkspace();
  await saveToS3(workspaceData, challengeId);
  res.json({ status: 'saved' });
});
```

### **Frontend Changes**

```typescript
// Challenge switching logic
const switchChallenge = async (newChallengeId: string) => {
  const response = await api.post('/sessions', { challengeId: newChallengeId });
  
  if (response.status === 409) {
    // Show exit current challenge prompt
    const shouldExit = await showExitPrompt(response.data.currentChallenge);
    
    if (shouldExit) {
      await api.delete(`/sessions/${sessionId}/challenge`);
      // Retry challenge creation
      return switchChallenge(newChallengeId);
    }
  }
  
  return response;
};
```

## 💰 Cost Impact

### **Cost Reduction**
- **Fewer containers**: 1 per user instead of up to 3
- **Longer sessions**: 4-hour timeout vs 2-hour (but fewer total containers)
- **Better utilization**: Containers are actively used longer

### **Resource Optimization**
```yaml
# Updated session limits
session_limits:
  max_containers_per_user: 1      # Down from 3
  max_challenges_per_container: 1  # One at a time
  session_timeout_minutes: 240     # 4 hours (up from 2)
  idle_timeout_minutes: 60         # 1 hour (up from 30 min)
```

## 🔒 Security Considerations

### **Workspace Isolation**
- Each challenge gets a clean workspace
- Previous challenge data is cleared (unless explicitly saved)
- User can't access other users' containers

### **Session Security**
- JWT tokens still required for all operations
- Container ownership verified on every request
- Automatic cleanup of expired containers

## 📊 Monitoring Updates

### **New Metrics to Track**
- Container reuse rate
- Challenge switch frequency
- Average session duration
- Workspace save/load times

### **Updated Dashboards**
```yaml
metrics:
  - name: "Active Containers per User"
    query: "SELECT COUNT(*) FROM sessions WHERE status IN ('running', 'ready') GROUP BY user_id"
  
  - name: "Challenge Switches per Session"
    query: "SELECT session_id, COUNT(DISTINCT challenge_id) FROM challenge_history GROUP BY session_id"
  
  - name: "Container Utilization"
    query: "SELECT AVG(EXTRACT(EPOCH FROM (terminated_at - created_at))/3600) FROM sessions"
```

## 🚀 Deployment Strategy

### **Phase 1: Deploy Infrastructure**
```bash
# Deploy new Lambda functions
./deploy.sh lambda

# Update task definition (no changes needed)
./deploy.sh task-definition
```

### **Phase 2: Update Frontend**
- Add challenge exit prompts
- Update session management logic
- Add challenge switching UI

### **Phase 3: Container Updates**
- Add new API endpoints to container
- Update challenge loading logic
- Test workspace clearing

### **Phase 4: Database Migration**
```sql
-- Add new columns
ALTER TABLE challenge_sessions ADD COLUMN current_challenge_id VARCHAR(255);
ALTER TABLE challenge_sessions ADD COLUMN container_type VARCHAR(20) DEFAULT 'persistent';

-- Update existing sessions
UPDATE challenge_sessions SET container_type = 'legacy' WHERE created_at < NOW();
```

## 🧪 Testing Strategy

### **Test Scenarios**
1. **First-time user**: Container creation and challenge loading
2. **Challenge switching**: Exit current, load new challenge
3. **Session resumption**: Return to existing challenge
4. **Container timeout**: Automatic cleanup after idle period
5. **Concurrent users**: Multiple users with persistent containers

### **Load Testing**
```bash
# Test container reuse under load
artillery run test-persistent-containers.yml

# Test challenge switching performance
artillery run test-challenge-switching.yml
```

## 🎯 Success Metrics

### **User Experience**
- **Challenge startup time**: Target <10 seconds (vs 2-3 minutes)
- **User satisfaction**: Measure via feedback surveys
- **Session completion rate**: Higher due to reduced friction

### **System Performance**
- **Container utilization**: Target >80% active time
- **Cost per user session**: Target 30-50% reduction
- **Resource efficiency**: Fewer total containers running

This persistent container architecture provides a dramatically better user experience while reducing costs and complexity. The one-time container startup delay is much more acceptable than repeated delays for every challenge.
