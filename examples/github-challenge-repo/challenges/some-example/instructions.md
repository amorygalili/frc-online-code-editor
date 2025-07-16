# Hello Robot World Challenge

Welcome to your first FRC programming challenge! In this challenge, you'll learn the fundamentals of FRC robot programming by creating a basic robot program.

## Learning Objectives

By completing this challenge, you will:
- Understand the basic structure of an FRC robot program
- Learn how to use the Robot class and its methods
- Implement basic robot initialization and periodic functions
- Test your code using the robot simulator

## Background

Every FRC robot program is built around the `Robot` class, which extends `TimedRobot`. This class provides several methods that are called automatically by the robot framework at different times:

- `robotInit()` - Called once when the robot starts
- `robotPeriodic()` - Called every 20ms regardless of mode
- `autonomousInit()` - Called once when autonomous mode starts
- `autonomousPeriodic()` - Called every 20ms during autonomous
- `teleopInit()` - Called once when teleop mode starts
- `teleopPeriodic()` - Called every 20ms during teleop
- `disabledInit()` - Called once when robot is disabled
- `disabledPeriodic()` - Called every 20ms when disabled

## Your Task

1. **Complete the `robotInit()` method**:
   - Add a print statement that says "Hello Robot World! Robot initialized successfully!"
   - Initialize any variables or systems your robot needs

2. **Complete the `teleopPeriodic()` method**:
   - Add a print statement that shows the robot is running in teleop mode
   - This should print every few seconds, not every loop (hint: use a counter)

3. **Complete the `autonomousPeriodic()` method**:
   - Add code that prints "Autonomous running..." every 2 seconds
   - Use a timer or counter to control the printing frequency

## Tips

- Use `System.out.println()` to print messages to the console
- Remember that periodic methods run every 20ms (50 times per second)
- To avoid spamming the console, use counters or timers for periodic printing
- Don't forget to call `super()` methods when overriding if needed

## Testing Your Code

1. Build your code using the build system
2. Run the robot simulator
3. Switch between different modes (disabled, autonomous, teleop) and observe the console output
4. Verify that your messages appear at the correct times

## Success Criteria

Your solution should:
- ✅ Print initialization message when robot starts
- ✅ Print teleop messages periodically (not every loop)
- ✅ Print autonomous messages periodically
- ✅ Build without errors
- ✅ Run successfully in simulation

## Extensions (Optional)

Once you've completed the basic challenge, try these extensions:

1. **Add Logging**: Replace `System.out.println()` with proper WPILib logging
2. **SmartDashboard Integration**: Display robot status on SmartDashboard
3. **Mode Tracking**: Keep track of how long the robot has been in each mode

## Next Steps

After completing this challenge, you'll be ready to move on to:
- Basic Motor Control
- Sensor Reading
- Driver Input Handling

Good luck, and welcome to FRC programming! 🤖
