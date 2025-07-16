// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import edu.wpi.first.wpilibj.TimedRobot;

/**
 * The VM is configured to automatically run this class, and to call the functions corresponding to
 * each mode, as described in the TimedRobot documentation. If you change the name of this class or
 * the package after creating this project, you must also update the build.gradle file in the
 * project.
 */
public class Robot extends TimedRobot {
  /**
   * This function is run when the robot is first started up and should be used for any
   * initialization code.
   */
  @Override
  public void robotInit() {
    // TODO: Add your robot initialization code here
    // This method runs once when the robot starts
    
    System.out.println("Hello Robot World! Robot is initializing...");
  }

  /**
   * This function is called every 20 ms, no matter the mode. Use this for items like diagnostics
   * that you want ran during disabled, autonomous, teleoperated and test.
   *
   * <p>This runs after the mode specific periodic functions, but before LiveWindow and
   * SmartDashboard integrated updating.
   */
  @Override
  public void robotPeriodic() {
    // TODO: Add code that runs periodically here
    // This method runs continuously every 20ms
  }

  /**
   * This autonomous (auto) mode code is run once when autonomous mode is enabled.
   */
  @Override
  public void autonomousInit() {
    // TODO: Add autonomous initialization code here
    System.out.println("Autonomous mode started!!!!");
  }

  /** This function is called periodically during autonomous. */
  @Override
  public void autonomousPeriodic() {
    // TODO: Add autonomous periodic code here
  }

  /** This function is called once when teleop is enabled. */
  @Override
  public void teleopInit() {
    // TODO: Add teleop initialization code here
    System.out.println("Teleop mode started!");
  }

  /** This function is called periodically during operator control. */
  @Override
  public void teleopPeriodic() {
    // TODO: Add teleop periodic code here
    // This is where you'll typically handle driver input
  }

  /** This function is called once when the robot is disabled. */
  @Override
  public void disabledInit() {
    // TODO: Add disabled initialization code here
    System.out.println("Robot disabled");
  }

  /** This function is called periodically when disabled. */
  @Override
  public void disabledPeriodic() {
    // TODO: Add disabled periodic code here
  }

  /** This function is called once when test mode is enabled. */
  @Override
  public void testInit() {
    // TODO: Add test initialization code here
    System.out.println("Test mode started!");
  }

  /** This function is called periodically during test mode. */
  @Override
  public void testPeriodic() {
    // TODO: Add test periodic code here
  }

  /** This function is called once when the robot is first started up. */
  @Override
  public void simulationInit() {
    // TODO: Add simulation initialization code here
    System.out.println("Simulation started!");
  }

  /** This function is called periodically whilst in simulation. */
  @Override
  public void simulationPeriodic() {
    // TODO: Add simulation periodic code here
  }
}
