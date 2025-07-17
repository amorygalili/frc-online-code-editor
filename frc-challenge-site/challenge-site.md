# FRC Programming Challenge Site - Architecture Plan

## 🎯 Project Overview

A web-based FRC programming challenge platform that provides hands-on robotics programming education through interactive challenges. Each challenge presents users with specific goals that must be achieved by writing and testing robot code in a browser-based environment powered by WPILib and Monaco Editor.

## 🏗️ High-Level Architecture

### Current Foundation
- **Frontend**: React + TypeScript + Vite
- **Editor**: Monaco Editor with Java Language Server integration
- **Simulation**: WPILib HAL simulation with NetworkTables
- **Containerization**: Docker for isolated development environments
- **Build System**: Gradle with WPILib integration

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Cloud Infrastructure                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   CloudFront    │  │      Route53    │  │   Certificate   │  │
│  │   (CDN/SSL)     │  │     (DNS)       │  │   Manager       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │      ALB        │  │    API Gateway  │  │      WAF        │  │
│  │ (Load Balancer) │  │   (REST API)    │  │   (Security)    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │      ECS        │  │     Lambda      │  │      RDS        │  │
│  │  (Containers)   │  │  (Serverless)   │  │   (Database)    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │       S3        │  │    Cognito      │  │   CloudWatch    │  │
│  │   (Storage)     │  │     (Auth)      │  │   (Monitoring)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Technical Stack

### Frontend (React SPA)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (already integrated)
- **Editor**: Monaco Editor with Java Language Server
- **State Management**: React Context + useReducer
- **Routing**: React Router
- **HTTP Client**: Axios or Fetch API
- **Authentication**: AWS Amplify (Cognito integration)

### Backend Services
- **Authentication**: AWS Cognito with Google OAuth
- **API**: AWS API Gateway + Lambda functions
- **Database**: Amazon RDS (PostgreSQL)
- **File Storage**: Amazon S3
- **Container Orchestration**: Amazon ECS with Fargate
- **Load Balancing**: Application Load Balancer (ALB)
- **CDN**: CloudFront
- **Monitoring**: CloudWatch + X-Ray

### Challenge Runtime Environment
- **Base Image**: Current Docker setup with WPILib
- **Orchestration**: ECS Tasks (one per active challenge session)
- **Networking**: VPC with private subnets
- **Storage**: EFS for persistent workspace data
- **Resource Limits**: CPU/Memory constraints per container

## 📊 Database Schema

### Core Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Challenges table
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
    category VARCHAR(50) NOT NULL, -- 'basics', 'sensors', 'autonomous', 'advanced'
    learning_objectives TEXT[],
    estimated_time_minutes INTEGER,
    starter_code_s3_key VARCHAR(500),
    solution_code_s3_key VARCHAR(500),
    test_cases JSONB,
    success_criteria JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_published BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0
);

-- User challenge progress
CREATE TABLE user_challenge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'abandoned'
    current_code_s3_key VARCHAR(500),
    git_repository_url VARCHAR(500),
    git_branch VARCHAR(100) DEFAULT 'main',
    completion_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attempts_count INTEGER DEFAULT 0,
    hints_used INTEGER DEFAULT 0,
    UNIQUE(user_id, challenge_id)
);

-- Challenge sessions (active containers)
CREATE TABLE challenge_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    ecs_task_arn VARCHAR(500),
    container_endpoint VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'starting', -- 'starting', 'running', 'stopping', 'stopped', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Challenge categories for organization
CREATE TABLE challenge_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0
);
```

## 🔐 Authentication & Authorization

### AWS Cognito Setup
```javascript
// Cognito User Pool Configuration
{
  "UserPoolName": "frc-challenge-site-users",
  "Policies": {
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  },
  "Schema": [
    {
      "Name": "email",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    },
    {
      "Name": "name",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    }
  ],
  "AutoVerifiedAttributes": ["email"],
  "UsernameAttributes": ["email"],
  "ExplicitAuthFlows": [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}
```

### Google OAuth Integration
- Configure Google as an identity provider in Cognito
- Set up OAuth 2.0 flow with appropriate scopes
- Handle token exchange and user profile mapping

## 🐳 Container Management Strategy

### ECS Task Definition
```json
{
  "family": "frc-challenge-runtime",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "wpilib-editor",
      "image": "your-account.dkr.ecr.region.amazonaws.com/frc-challenge-runtime:latest",
      "portMappings": [
        {
          "containerPort": 30003,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "CHALLENGE_ID",
          "value": "${challenge_id}"
        },
        {
          "name": "USER_ID",
          "value": "${user_id}"
        }
      ],
      "mountPoints": [
        {
          "sourceVolume": "workspace",
          "containerPath": "/workspace",
          "readOnly": false
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/frc-challenge-runtime",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "volumes": [
    {
      "name": "workspace",
      "efsVolumeConfiguration": {
        "fileSystemId": "${efs_file_system_id}",
        "rootDirectory": "/challenges/${user_id}/${challenge_id}"
      }
    }
  ]
}
```

### Container Lifecycle Management
1. **Session Creation**: Lambda function creates ECS task
2. **Health Monitoring**: Regular health checks via ALB
3. **Auto-scaling**: Based on active sessions
4. **Session Cleanup**: Automatic termination after inactivity
5. **Resource Limits**: CPU/Memory constraints to prevent abuse

## 🚀 API Design

### REST API Endpoints

```typescript
// Authentication
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET  /auth/profile

// Challenges
GET    /api/challenges                    // List all published challenges
GET    /api/challenges/:id               // Get specific challenge details
GET    /api/challenges/categories        // Get challenge categories
GET    /api/challenges/:id/starter-code  // Get starter code for challenge

// User Progress
GET    /api/users/me/progress           // Get user's overall progress
GET    /api/users/me/challenges/:id     // Get user's progress for specific challenge
POST   /api/users/me/challenges/:id/start // Start a challenge
PUT    /api/users/me/challenges/:id/save  // Save current progress
POST   /api/users/me/challenges/:id/submit // Submit solution for validation

// Challenge Sessions
POST   /api/sessions                    // Create new challenge session
GET    /api/sessions/:id               // Get session details
DELETE /api/sessions/:id               // Terminate session
POST   /api/sessions/:id/keepalive     // Extend session timeout

// File Management
GET    /api/sessions/:id/files         // List files in workspace
GET    /api/sessions/:id/files/*path   // Get file content
PUT    /api/sessions/:id/files/*path   // Save file content
DELETE /api/sessions/:id/files/*path   // Delete file

// Build & Simulation
POST   /api/sessions/:id/build         // Trigger build
GET    /api/sessions/:id/build/status  // Get build status
POST   /api/sessions/:id/simulate      // Start simulation
GET    /api/sessions/:id/simulate/status // Get simulation status
```

## 📁 Project Structure

```
frc-challenge-site/
├── frontend/                          # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/                  # Authentication components
│   │   │   ├── challenges/            # Challenge-related components
│   │   │   ├── editor/                # Monaco editor components (existing)
│   │   │   ├── simulation/            # Simulation components (existing)
│   │   │   └── common/                # Shared components
│   │   ├── contexts/                  # React contexts (existing + new)
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── services/                  # API service layer
│   │   ├── types/                     # TypeScript type definitions
│   │   ├── utils/                     # Utility functions
│   │   └── pages/                     # Page components
│   │       ├── HomePage.tsx
│   │       ├── ChallengesPage.tsx
│   │       ├── ChallengePage.tsx
│   │       ├── ProfilePage.tsx
│   │       └── LoginPage.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/                           # Backend services
│   ├── lambda/                        # AWS Lambda functions
│   │   ├── auth/                      # Authentication handlers
│   │   ├── challenges/                # Challenge management
│   │   ├── sessions/                  # Session management
│   │   └── users/                     # User management
│   ├── shared/                        # Shared utilities
│   │   ├── database/                  # Database connection & models
│   │   ├── auth/                      # Authentication utilities
│   │   └── validation/                # Request validation schemas
│   └── package.json
├── infrastructure/                    # Infrastructure as Code
│   ├── terraform/                     # Terraform configurations
│   │   ├── modules/                   # Reusable modules
│   │   ├── environments/              # Environment-specific configs
│   │   └── main.tf
│   └── docker/                        # Docker configurations
│       ├── challenge-runtime/         # Enhanced version of current setup
│       └── build-scripts/
├── challenges/                        # Challenge definitions
│   ├── templates/                     # Challenge template projects
│   ├── solutions/                     # Reference solutions
│   └── metadata/                      # Challenge metadata & configs
├── docs/                             # Documentation
└── scripts/                          # Deployment & utility scripts
```

## 🎮 Challenge System Design

### Challenge Types & Categories

1. **Basics** (Beginner)
   - Hello Robot World
   - Motor Control Fundamentals
   - Sensor Reading Basics
   - Simple Drive Systems

2. **Sensors & Input** (Intermediate)
   - Encoder-based Movement
   - Gyroscope Navigation
   - Vision Processing Basics
   - Limit Switch Integration

3. **Autonomous Programming** (Intermediate-Advanced)
   - Path Following
   - State Machine Design
   - PID Control Implementation
   - Multi-step Autonomous Routines

4. **Advanced Systems** (Advanced)
   - Complex Subsystem Integration
   - Real-time Control Systems
   - Advanced Vision Processing
   - Competition-style Challenges

### Challenge Structure

Each challenge includes:
- **Learning Objectives**: Clear goals and concepts to master
- **Starter Code**: Pre-configured robot project with TODO sections
- **Instructions**: Step-by-step guidance and hints
- **Success Criteria**: Automated validation of solution
- **Test Cases**: Unit tests and simulation scenarios
- **Reference Solution**: Complete working implementation
- **Extensions**: Optional advanced features to implement

### Progress Tracking

- **Completion Percentage**: Based on test case success
- **Code Quality Metrics**: Basic static analysis
- **Time Tracking**: Development time per challenge
- **Hint Usage**: Track when users need help
- **Attempt History**: Save previous attempts for learning

## 🔄 Git Integration Strategy

### Repository Structure per User
```
user-challenges-{user-id}/
├── challenge-1/
│   ├── src/main/java/frc/robot/
│   ├── build.gradle
│   └── .git/
├── challenge-2/
│   └── ...
└── README.md
```

### Git Workflow
1. **Challenge Start**: Fork template repository
2. **Auto-save**: Periodic commits of user progress
3. **Manual Save**: User-triggered save points
4. **Solution Submission**: Tagged commits for evaluation
5. **Progress Recovery**: Restore from git history

### Implementation Options
- **AWS CodeCommit**: Fully managed Git repositories
- **GitHub Integration**: Use GitHub API for repository management
- **GitLab Integration**: Self-hosted or GitLab.com
- **Custom Git Server**: Lightweight Git server in ECS

## 💾 Data Persistence Strategy

### User Code Storage
- **Primary**: EFS mounted volumes for active sessions
- **Backup**: S3 for long-term storage and archival
- **Version Control**: Git repositories for history

### Session Data
- **Active Sessions**: In-memory + Redis for real-time data
- **Persistent State**: RDS for user progress and metadata
- **File Snapshots**: S3 for periodic workspace backups

### Caching Strategy
- **Challenge Metadata**: CloudFront + S3 for static content
- **User Sessions**: ElastiCache Redis for session state
- **API Responses**: API Gateway caching for frequently accessed data

## 🔒 Security Considerations

### Container Security
- **Resource Limits**: CPU/Memory constraints per container
- **Network Isolation**: VPC with private subnets
- **File System Restrictions**: Read-only base image, writable workspace only
- **Process Isolation**: Non-root user execution
- **Security Scanning**: Regular vulnerability scans of container images

### API Security
- **Authentication**: JWT tokens from Cognito
- **Authorization**: Role-based access control
- **Rate Limiting**: API Gateway throttling
- **Input Validation**: Comprehensive request validation
- **CORS Configuration**: Restricted cross-origin requests

### Data Protection
- **Encryption at Rest**: RDS, S3, EFS encryption
- **Encryption in Transit**: TLS/SSL for all communications
- **Access Logging**: CloudTrail for audit trails
- **Data Retention**: Automated cleanup of old sessions

## 📈 Monitoring & Observability

### Application Metrics
- **User Engagement**: Challenge completion rates, time spent
- **System Performance**: Container startup times, API response times
- **Error Tracking**: Application errors and exceptions
- **Resource Utilization**: CPU, memory, storage usage

### Infrastructure Monitoring
- **CloudWatch Dashboards**: Real-time system metrics
- **X-Ray Tracing**: Distributed request tracing
- **Log Aggregation**: Centralized logging with CloudWatch Logs
- **Alerting**: Automated alerts for system issues

### Business Metrics
- **User Acquisition**: Registration and retention rates
- **Challenge Popularity**: Most/least popular challenges
- **Learning Outcomes**: Success rates by challenge difficulty
- **Platform Usage**: Peak usage times and patterns

## 🚀 Deployment Strategy

### CI/CD Pipeline
```yaml
# GitHub Actions workflow example
name: Deploy FRC Challenge Site

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build frontend
        run: npm run build

  deploy-infrastructure:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
      - name: Deploy infrastructure
        run: |
          cd infrastructure/terraform
          terraform init
          terraform plan
          terraform apply -auto-approve

  deploy-application:
    needs: [test, deploy-infrastructure]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to AWS
        run: |
          # Deploy Lambda functions
          # Update ECS services
          # Deploy frontend to S3/CloudFront
```

### Environment Strategy
- **Development**: Local development with Docker Compose
- **Staging**: AWS environment with reduced resources
- **Production**: Full AWS deployment with high availability

### Blue-Green Deployment
- **Frontend**: CloudFront distribution switching
- **Backend**: ECS service updates with rolling deployment
- **Database**: Schema migrations with backward compatibility

## 💰 Cost Optimization

### Resource Management
- **Auto-scaling**: Scale containers based on demand
- **Spot Instances**: Use Spot instances for non-critical workloads
- **Reserved Capacity**: Reserve instances for predictable workloads
- **Lifecycle Policies**: Automatic cleanup of old data

### Cost Monitoring
- **AWS Cost Explorer**: Track spending by service
- **Budget Alerts**: Automated alerts for cost thresholds
- **Resource Tagging**: Detailed cost allocation
- **Usage Analytics**: Optimize based on actual usage patterns

## 🎯 Success Metrics & KPIs

### User Engagement
- **Daily/Monthly Active Users**: Platform usage metrics
- **Challenge Completion Rate**: Percentage of started challenges completed
- **Session Duration**: Average time spent per session
- **Return Rate**: Users returning to continue challenges

### Learning Effectiveness
- **Skill Progression**: Improvement in challenge difficulty over time
- **Concept Mastery**: Success rates for specific programming concepts
- **Help-seeking Behavior**: Usage of hints and documentation
- **Code Quality**: Improvement in code structure and best practices

### Platform Performance
- **Container Startup Time**: Time to launch challenge environment
- **API Response Time**: Average response time for API calls
- **System Uptime**: Platform availability percentage
- **Error Rate**: Application and infrastructure error rates

## 🔄 Migration Plan from Current Setup

### Phase 1: Foundation (Weeks 1-4)
- [ ] Set up AWS infrastructure (Terraform)
- [ ] Implement authentication with Cognito
- [ ] Create basic challenge database schema
- [ ] Develop core API endpoints
- [ ] Set up CI/CD pipeline

### Phase 2: Core Features (Weeks 5-8)
- [ ] Migrate current Monaco editor setup to new architecture
- [ ] Implement challenge session management
- [ ] Create challenge browsing and selection UI
- [ ] Develop progress tracking system
- [ ] Implement basic challenge types

### Phase 3: Enhanced Features (Weeks 9-12)
- [ ] Add Git integration for progress persistence
- [ ] Implement advanced challenge validation
- [ ] Create admin interface for challenge management
- [ ] Add monitoring and analytics
- [ ] Performance optimization and testing

### Phase 4: Launch Preparation (Weeks 13-16)
- [ ] Security audit and penetration testing
- [ ] Load testing and performance tuning
- [ ] Documentation and user guides
- [ ] Beta testing with select users
- [ ] Production deployment and monitoring setup

## 🤔 Feedback on Your Approach

### ✅ Strengths of Your Current Approach

1. **Solid Technical Foundation**: Your current Monaco Editor + WPILib setup is excellent and provides a professional development experience.

2. **Docker Containerization**: Using containers for isolation is perfect for this use case - it provides security, consistency, and scalability.

3. **Google OAuth Choice**: Google authentication is user-friendly and widely accepted, especially in educational contexts.

4. **AWS Hosting**: AWS provides all the services needed for this architecture and scales well.

5. **Git for Progress**: Using Git internally for progress management is brilliant - it provides version control, backup, and recovery capabilities.

### 🔧 Suggestions for Improvement

1. **Consider Serverless-First Approach**:
   - Use AWS Lambda for API endpoints instead of always-on servers
   - Implement container-on-demand rather than persistent containers
   - This reduces costs significantly for educational platforms with sporadic usage

2. **Enhanced Security Model**:
   - Implement container resource limits and network isolation
   - Add code execution sandboxing within containers
   - Consider using AWS Fargate for better security isolation

3. **Progressive Challenge System**:
   - Implement prerequisite chains (Challenge B unlocks after Challenge A)
   - Add skill trees and learning paths
   - Include peer code review features for advanced challenges

4. **Scalability Considerations**:
   - Plan for container auto-scaling based on demand
   - Implement session pooling to reduce cold start times
   - Consider using AWS ECS Service Connect for service mesh

5. **Educational Features**:
   - Add integrated tutorials and documentation
   - Implement code explanation and hint systems
   - Include video tutorials and interactive guides

### ❓ Questions for Clarification

1. **Target Audience**: What's the primary audience? (High school students, college, professionals, mixed?)

2. **Challenge Complexity**: How complex should the most advanced challenges be? (Basic FRC concepts vs. competition-level programming?)

3. **Collaboration Features**: Do you want team-based challenges or individual-only?

4. **Assessment Integration**: Should this integrate with existing LMS systems or gradebooks?

5. **Offline Capabilities**: Any need for offline development or is online-only acceptable?

6. **Mobile Support**: Should the platform work on tablets/mobile devices?

7. **Budget Constraints**: What's the expected budget range for AWS hosting?

8. **Timeline**: What's your target launch date for the MVP?

This plan provides a comprehensive roadmap for building a scalable, secure, and engaging FRC programming challenge platform. The architecture leverages your existing strengths while addressing the unique requirements of an educational platform with proper authentication, progress tracking, and containerized execution environments.

## 🚀 Alternative MVP Architecture (Cost-Optimized)

For teams looking to start with a simpler, more cost-effective approach, here's an alternative architecture that focuses on minimizing infrastructure complexity while maintaining the core functionality:

### Simplified Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Static)                        │
├─────────────────────────────────────────────────────────────┤
│  React SPA hosted on:                                      │
│  • Vercel/Netlify (easiest deployment)                    │
│  • S3 + CloudFront (AWS native)                           │
│  • Amplify Hosting (AWS integrated)                       │
│                                                            │
│  Pages: Home, Browse Challenges, Profile, Login           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Serverless)                 │
├─────────────────────────────────────────────────────────────┤
│  AWS Lambda Functions + API Gateway:                      │
│  • Authentication & user management                       │
│  • Challenge metadata & progress tracking                 │
│  • Session management (create/destroy containers)         │
│  • File operations proxy                                  │
│                                                            │
│  Cost: Pay per request (free tier: 1M requests/month)     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Challenge Runtime (Fargate Only)               │
├─────────────────────────────────────────────────────────────┤
│  ECS Fargate Tasks (on-demand):                           │
│  • Monaco Editor + Java Language Server                   │
│  • WPILib simulation environment                          │
│  • User's coding workspace                                │
│                                                            │
│  Cost: ~$0.04/hour per active session (scales to zero)    │
└─────────────────────────────────────────────────────────────┘
```

### Key Differences from Full Architecture

| Component | Full Architecture | MVP Architecture |
|-----------|------------------|------------------|
| **Frontend Hosting** | CloudFront + S3 + ALB | Vercel/Netlify (free tier) |
| **API Layer** | API Gateway + Lambda + ALB | API Gateway + Lambda only |
| **Database** | RDS PostgreSQL | PlanetScale (free tier) or small RDS |
| **Container Orchestration** | ECS + ALB + Auto-scaling | ECS Fargate (simple tasks) |
| **Monitoring** | CloudWatch + X-Ray + Custom dashboards | Basic CloudWatch |
| **Infrastructure** | Terraform + Multi-environment | Manual setup or simple CDK |

### MVP Technology Stack

#### Frontend
- **Hosting**: Vercel or Netlify (free tier available)
- **Framework**: React + TypeScript (existing setup)
- **Authentication**: AWS Amplify Auth (simpler than direct Cognito)
- **State Management**: React Context (existing)
- **Deployment**: Git-based deployment (push to deploy)

#### Backend
- **API**: AWS Lambda + API Gateway
- **Database**: PlanetScale (MySQL, free tier) or small RDS instance
- **Authentication**: AWS Cognito (same as full plan)
- **File Storage**: S3 (same as full plan)
- **Session Management**: Simple ECS task creation/deletion

#### Challenge Runtime
- **Container Platform**: ECS Fargate (same as full plan)
- **Networking**: Default VPC (simpler setup)
- **Storage**: EFS or S3 (depending on requirements)
- **Load Balancing**: Direct container access (no ALB initially)

### MVP Implementation Phases

#### Phase 1: Core MVP (Weeks 1-6)
- [ ] Deploy React frontend to Vercel/Netlify
- [ ] Set up AWS Cognito for authentication
- [ ] Create basic Lambda functions for API
- [ ] Set up simple database (PlanetScale or small RDS)
- [ ] Implement basic challenge browsing and user progress

#### Phase 2: Challenge Runtime (Weeks 7-10)
- [ ] Containerize existing Monaco editor setup
- [ ] Deploy to ECS Fargate with basic task definitions
- [ ] Implement session creation/destruction via Lambda
- [ ] Add file persistence (S3 or EFS)
- [ ] Basic challenge validation and progress tracking

#### Phase 3: Polish & Scale (Weeks 11-14)
- [ ] Add monitoring and error handling
- [ ] Implement auto-cleanup of idle sessions
- [ ] Add more challenge types and content
- [ ] Performance optimization
- [ ] User testing and feedback integration

#### Phase 4: Migration Path (Optional)
- [ ] Migrate to full architecture as usage grows
- [ ] Add advanced monitoring and observability
- [ ] Implement multi-environment deployment
- [ ] Add advanced security features

### Cost Comparison

#### MVP Architecture Costs (Monthly)
```
Low Usage (10-50 concurrent users):
• Frontend (Vercel): $0/month (free tier)
• API (Lambda): $0-10/month (free tier covers most)
• Database (PlanetScale): $0/month (free tier)
• Fargate: $0.04/hour × active sessions
• Storage (S3): $1-5/month
• Total: ~$5-20/month + session usage

Medium Usage (100+ concurrent users):
• Frontend: $20/month
• API: $30-50/month
• Database: $39/month (PlanetScale Pro)
• Fargate: Scales with demand
• Storage: $10-20/month
• Total: ~$100-150/month + session usage
```

#### Full Architecture Costs (Monthly)
```
Production Ready (100+ concurrent users):
• All services: $300-500/month base
• Plus usage-based costs
• Higher availability and performance
• Advanced monitoring and security
```

### Migration Strategy

The MVP architecture is designed to easily migrate to the full architecture:

1. **Database**: PlanetScale → RDS (export/import)
2. **Frontend**: Vercel → S3 + CloudFront (same build artifacts)
3. **API**: Lambda functions remain the same
4. **Infrastructure**: Manual → Terraform (codify existing resources)
5. **Monitoring**: Basic → Advanced (add X-Ray, custom dashboards)

### When to Migrate to Full Architecture

Consider migrating when you experience:
- **High concurrent usage** (100+ simultaneous sessions)
- **Need for advanced monitoring** and observability
- **Multi-environment requirements** (dev/staging/prod)
- **Advanced security requirements**
- **Team growth** requiring Infrastructure as Code

### MVP Pros and Cons

#### ✅ Advantages
- **Lower cost** for initial development and testing
- **Faster time to market** with simpler setup
- **Less infrastructure complexity** to manage
- **Easy to iterate** and make changes
- **Good for validation** of concept and user demand

#### ⚠️ Considerations
- **Less monitoring** and observability initially
- **Manual scaling** decisions as you grow
- **Simpler security model** (still secure, but less sophisticated)
- **Migration effort** required as you scale

This MVP approach allows you to validate your concept and build a user base before investing in the full production architecture. The containerized challenge runtime using Fargate remains the same in both approaches, ensuring your core educational experience is consistent.