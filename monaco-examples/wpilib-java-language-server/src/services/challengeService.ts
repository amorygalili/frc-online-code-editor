// Challenge Service - API layer for challenge data
// This will eventually connect to AWS Lambda functions

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  estimatedTime: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'locked';
  progress: number;
  prerequisites?: string[];
  learningObjectives: string[];
  instructions: string;
  hints?: string[];
  starterCode?: string;
  solutionCode?: string;
  testCases?: any[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeProgress {
  challengeId: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  lastCode?: string;
  completedAt?: string;
  timeSpent: number; // in minutes
}

export interface ChallengeFilters {
  category?: string;
  difficulty?: string;
  status?: string;
  search?: string;
}

// Mock data for development
const mockChallenges: Challenge[] = [
  {
    id: '1',
    title: 'Hello Robot World',
    description: 'Get started with your first robot program and learn the fundamentals of FRC programming.',
    difficulty: 'Beginner',
    category: 'Basics',
    estimatedTime: '15 min',
    status: 'not_started',
    progress: 0,
    learningObjectives: [
      'Understand the basic structure of an FRC robot program',
      'Learn how to use the Robot class and its methods',
      'Implement basic robot initialization and periodic functions',
      'Test your code using the robot simulator',
    ],
    instructions: `# Hello Robot World Challenge

Welcome to your first FRC programming challenge! In this challenge, you'll create your first robot program.

## Objectives
- Create a basic robot class that extends TimedRobot
- Implement robotInit() and teleopPeriodic() methods
- Print "Hello Robot World!" to the console
- Test your program in the simulator

## Getting Started
1. Look at the starter code provided
2. Complete the TODO items
3. Run your code in the simulator
4. Verify the output in the console`,
    hints: [
      'Use System.out.println() to print messages to the console',
      'The robotInit() method is called once when the robot starts',
      'The teleopPeriodic() method is called every 20ms during teleop mode',
      'Look for the TODO comments in the starter code',
    ],
    starterCode: `package frc.robot;

import edu.wpi.first.wpilibj.TimedRobot;

public class Robot extends TimedRobot {

  @Override
  public void robotInit() {
    // TODO: Print "Hello Robot World!" to the console
  }

  @Override
  public void teleopPeriodic() {
    // TODO: This method runs periodically during teleop
  }
}`,
    tags: ['basics', 'first-program', 'console'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Motor Control Basics',
    description: 'Learn how to control motors and create a simple drive system for your robot.',
    difficulty: 'Beginner',
    category: 'Basics',
    estimatedTime: '25 min',
    status: 'locked',
    progress: 0,
    prerequisites: ['1'],
    learningObjectives: [
      'Understand motor controller classes in WPILib',
      'Learn how to create and configure motor controllers',
      'Implement basic motor control with joystick input',
      'Test motor control in simulation',
    ],
    instructions: `# Motor Control Basics

Learn the fundamentals of controlling motors in FRC programming.

## Objectives
- Create motor controller objects
- Connect joystick input to motor output
- Implement safety features
- Test in simulation`,
    tags: ['motors', 'joystick', 'drive'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    title: 'Sensor Reading Fundamentals',
    description: 'Master the basics of reading sensor data and using it in your robot programs.',
    difficulty: 'Intermediate',
    category: 'Sensors',
    estimatedTime: '30 min',
    status: 'locked',
    progress: 0,
    prerequisites: ['1', '2'],
    learningObjectives: [
      'Understand different types of sensors in FRC',
      'Learn how to read encoder values',
      'Implement sensor-based decision making',
      'Debug sensor readings',
    ],
    instructions: `# Sensor Reading Fundamentals

Explore how to read and use sensor data in your robot programs.`,
    tags: ['sensors', 'encoders', 'data'],
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
  {
    id: '4',
    title: 'Autonomous Movement',
    description: 'Create your first autonomous routine with timed movements and sensor feedback.',
    difficulty: 'Intermediate',
    category: 'Autonomous',
    estimatedTime: '45 min',
    status: 'locked',
    progress: 0,
    prerequisites: ['2', '3'],
    learningObjectives: [
      'Understand autonomous mode in FRC',
      'Implement timed movements',
      'Use sensor feedback for precise control',
      'Create a complete autonomous routine',
    ],
    instructions: `# Autonomous Movement Challenge

Build your first autonomous routine that can move the robot precisely.`,
    tags: ['autonomous', 'movement', 'timing'],
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
  },
  {
    id: '5',
    title: 'Advanced PID Control',
    description: 'Master PID controllers for precise robot movement and mechanism control.',
    difficulty: 'Advanced',
    category: 'Advanced',
    estimatedTime: '60 min',
    status: 'locked',
    progress: 0,
    prerequisites: ['3', '4'],
    learningObjectives: [
      'Understand PID control theory',
      'Implement PID controllers in WPILib',
      'Tune PID parameters',
      'Apply PID to different mechanisms',
    ],
    instructions: `# Advanced PID Control

Learn to implement and tune PID controllers for precise robot control.`,
    tags: ['pid', 'control', 'tuning', 'advanced'],
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
  },
];

// Mock user progress data
const mockProgress: Record<string, ChallengeProgress> = {
  '1': {
    challengeId: '1',
    userId: 'user123',
    status: 'completed',
    progress: 100,
    completedAt: '2024-01-15T10:30:00Z',
    timeSpent: 20,
  },
  '2': {
    challengeId: '2',
    userId: 'user123',
    status: 'in_progress',
    progress: 60,
    lastCode: 'partial implementation...',
    timeSpent: 15,
  },
};

class ChallengeService {
  // Get all challenges with user progress applied
  async getChallenges(filters?: ChallengeFilters): Promise<Challenge[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let challenges = [...mockChallenges];
    
    // Apply user progress to challenges
    challenges = challenges.map(challenge => {
      const progress = mockProgress[challenge.id];
      if (progress) {
        return {
          ...challenge,
          status: progress.status,
          progress: progress.progress,
        };
      }
      
      // Check if challenge should be unlocked based on prerequisites
      if (challenge.prerequisites && challenge.prerequisites.length > 0) {
        const prerequisitesMet = challenge.prerequisites.every(prereqId => {
          const prereqProgress = mockProgress[prereqId];
          return prereqProgress && prereqProgress.status === 'completed';
        });
        
        return {
          ...challenge,
          status: prerequisitesMet ? 'not_started' : 'locked',
        };
      }
      
      return challenge;
    });
    
    // Apply filters
    if (filters) {
      if (filters.category && filters.category !== 'all') {
        challenges = challenges.filter(c => c.category.toLowerCase() === filters.category!.toLowerCase());
      }
      
      if (filters.difficulty && filters.difficulty !== 'all') {
        challenges = challenges.filter(c => c.difficulty.toLowerCase() === filters.difficulty!.toLowerCase());
      }
      
      if (filters.status && filters.status !== 'all') {
        challenges = challenges.filter(c => c.status === filters.status);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        challenges = challenges.filter(c => 
          c.title.toLowerCase().includes(searchLower) ||
          c.description.toLowerCase().includes(searchLower) ||
          c.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
    }
    
    return challenges;
  }
  
  // Get a specific challenge by ID
  async getChallenge(id: string): Promise<Challenge | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const challenge = mockChallenges.find(c => c.id === id);
    if (!challenge) return null;
    
    // Apply user progress
    const progress = mockProgress[id];
    if (progress) {
      return {
        ...challenge,
        status: progress.status,
        progress: progress.progress,
      };
    }
    
    return challenge;
  }
  
  // Get user progress for a challenge
  async getChallengeProgress(challengeId: string): Promise<ChallengeProgress | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockProgress[challengeId] || null;
  }
  
  // Update user progress
  async updateChallengeProgress(challengeId: string, progress: Partial<ChallengeProgress>): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (mockProgress[challengeId]) {
      mockProgress[challengeId] = { ...mockProgress[challengeId], ...progress };
    } else {
      mockProgress[challengeId] = {
        challengeId,
        userId: 'user123', // This would come from auth context
        status: 'not_started',
        progress: 0,
        timeSpent: 0,
        ...progress,
      };
    }
  }
  
  // Get available categories
  getCategories(): string[] {
    return ['All', 'Basics', 'Sensors', 'Autonomous', 'Advanced'];
  }
  
  // Get available difficulty levels
  getDifficulties(): string[] {
    return ['All', 'Beginner', 'Intermediate', 'Advanced'];
  }
}

// Export singleton instance
export const challengeService = new ChallengeService();
