// Data seeding script for DynamoDB tables
import { Challenge } from '../types';
import { putItem, TABLES, getCurrentTimestamp } from '../utils/dynamodb';

const sampleChallenges: Omit<Challenge, 'createdAt' | 'updatedAt'>[] = [
  {
    id: '1',
    title: 'Hello Robot World',
    description: 'Get started with your first robot program and learn the fundamentals of FRC programming.',
    difficulty: 'Beginner',
    category: 'Basics',
    estimatedTime: '15 min',
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
    prerequisites: [],
    isPublished: true,
    sortOrder: 1,
  },
  {
    id: '2',
    title: 'Motor Control Basics',
    description: 'Learn how to control motors and create a simple drive system for your robot.',
    difficulty: 'Beginner',
    category: 'Basics',
    estimatedTime: '25 min',
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
    hints: [
      'Use PWMSparkMax or similar motor controller classes',
      'XboxController class provides easy joystick access',
      'Remember to set motor safety and inversion if needed',
      'Test with small values first',
    ],
    tags: ['motors', 'joystick', 'drive'],
    prerequisites: ['1'],
    isPublished: true,
    sortOrder: 2,
  },
  {
    id: '3',
    title: 'Sensor Reading Fundamentals',
    description: 'Master the basics of reading sensor data and using it in your robot programs.',
    difficulty: 'Intermediate',
    category: 'Sensors',
    estimatedTime: '30 min',
    learningObjectives: [
      'Understand different types of sensors in FRC',
      'Learn how to read encoder values',
      'Implement sensor-based decision making',
      'Debug sensor readings',
    ],
    instructions: `# Sensor Reading Fundamentals

Explore how to read and use sensor data in your robot programs.`,
    hints: [
      'Encoders provide position and velocity feedback',
      'Use SmartDashboard to display sensor values',
      'Check sensor connections and wiring',
      'Consider sensor noise and filtering',
    ],
    tags: ['sensors', 'encoders', 'data'],
    prerequisites: ['1', '2'],
    isPublished: true,
    sortOrder: 3,
  },
  {
    id: '4',
    title: 'Autonomous Movement',
    description: 'Create your first autonomous routine with timed movements and sensor feedback.',
    difficulty: 'Intermediate',
    category: 'Autonomous',
    estimatedTime: '45 min',
    learningObjectives: [
      'Understand autonomous mode in FRC',
      'Implement timed movements',
      'Use sensor feedback for precise control',
      'Create a complete autonomous routine',
    ],
    instructions: `# Autonomous Movement Challenge

Build your first autonomous routine that can move the robot precisely.`,
    hints: [
      'Use Timer class for timed movements',
      'Combine multiple movement phases',
      'Test each phase individually',
      'Consider robot orientation and field position',
    ],
    tags: ['autonomous', 'movement', 'timing'],
    prerequisites: ['2', '3'],
    isPublished: true,
    sortOrder: 4,
  },
  {
    id: '5',
    title: 'Advanced PID Control',
    description: 'Master PID controllers for precise robot movement and mechanism control.',
    difficulty: 'Advanced',
    category: 'Advanced',
    estimatedTime: '60 min',
    learningObjectives: [
      'Understand PID control theory',
      'Implement PID controllers in WPILib',
      'Tune PID parameters',
      'Apply PID to different mechanisms',
    ],
    instructions: `# Advanced PID Control

Learn to implement and tune PID controllers for precise robot control.`,
    hints: [
      'Start with P (proportional) control only',
      'Add I (integral) to eliminate steady-state error',
      'Add D (derivative) to reduce oscillation',
      'Use SmartDashboard for live tuning',
    ],
    tags: ['pid', 'control', 'tuning', 'advanced'],
    prerequisites: ['3', '4'],
    isPublished: true,
    sortOrder: 5,
  },
];

export async function seedChallenges(): Promise<void> {
  console.log('Seeding challenges...');
  
  const timestamp = getCurrentTimestamp();
  
  for (const challengeData of sampleChallenges) {
    const challenge: Challenge = {
      ...challengeData,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Add GSI keys for DynamoDB indexes
    const challengeItem = {
      ...challenge,
      GSI1PK: challenge.category, // For category index
      GSI2PK: challenge.difficulty, // For difficulty index
    };

    try {
      await putItem(TABLES.CHALLENGES, challengeItem);
      console.log(`✓ Seeded challenge: ${challenge.title}`);
    } catch (error) {
      console.error(`✗ Failed to seed challenge ${challenge.title}:`, error);
    }
  }
  
  console.log('Challenge seeding completed!');
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedChallenges()
    .then(() => {
      console.log('Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
