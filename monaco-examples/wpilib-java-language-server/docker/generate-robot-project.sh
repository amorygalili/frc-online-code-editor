#!/bin/bash

# WPILib Robot Project Generation Script
# This script generates a new FRC robot project with proper structure and configuration

set -e

# Default values
PROJECT_NAME="RobotProject"
TEAM_NUMBER="0"
PACKAGE_NAME="frc.robot"
WORKSPACE_DIR="/home/jdtls/workspace"
WPILIB_HOME="/home/jdtls/wpilib/2025"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--name)
            PROJECT_NAME="$2"
            shift 2
            ;;
        -t|--team)
            TEAM_NUMBER="$2"
            shift 2
            ;;
        -p|--package)
            PACKAGE_NAME="$2"
            shift 2
            ;;
        -w|--workspace)
            WORKSPACE_DIR="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -n, --name NAME        Project name (default: RobotProject)"
            echo "  -t, --team NUMBER      Team number (default: 0)"
            echo "  -p, --package PACKAGE  Java package name (default: frc.robot)"
            echo "  -w, --workspace DIR    Workspace directory (default: /home/jdtls/workspace)"
            echo "  -h, --help            Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

PROJECT_DIR="${WORKSPACE_DIR}/${PROJECT_NAME}"

echo "Generating WPILib robot project..."
echo "Project Name: ${PROJECT_NAME}"
echo "Team Number: ${TEAM_NUMBER}"
echo "Package: ${PACKAGE_NAME}"
echo "Project Directory: ${PROJECT_DIR}"

# Remove existing project if it exists
if [ -d "${PROJECT_DIR}" ]; then
    echo "Removing existing project directory..."
    rm -rf "${PROJECT_DIR}"
fi

# Create project directory structure
mkdir -p "${PROJECT_DIR}"
mkdir -p "${PROJECT_DIR}/src/main/java/${PACKAGE_NAME//.//}"
mkdir -p "${PROJECT_DIR}/src/main/deploy"
mkdir -p "${PROJECT_DIR}/src/test/java/${PACKAGE_NAME//.//}"
mkdir -p "${PROJECT_DIR}/.wpilib"
mkdir -p "${PROJECT_DIR}/vendordeps"

# Copy build.gradle from template
if [ -f "${WPILIB_HOME}/templates/build.gradle.template" ]; then
    cp "${WPILIB_HOME}/templates/build.gradle.template" "${PROJECT_DIR}/build.gradle"
else
    echo "Warning: build.gradle template not found, creating basic version"
    cat > "${PROJECT_DIR}/build.gradle" << 'EOF'
plugins {
    id "java"
    id "edu.wpi.first.GradleRIO" version "2025.3.1"
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

def ROBOT_MAIN_CLASS = "frc.robot.Main"

dependencies {
    implementation wpi.java.deps.wpilib()
    implementation wpi.java.vendor.java()
    
    roborioDebug wpi.java.deps.wpilibJniDebug(wpi.platforms.roborio)
    roborioRelease wpi.java.deps.wpilibJniRelease(wpi.platforms.roborio)
    
    nativeDebug wpi.java.deps.wpilibJniDebug(wpi.platforms.desktop)
    nativeRelease wpi.java.deps.wpilibJniRelease(wpi.platforms.desktop)
    
    simulationDebug wpi.sim.enableDebug()
    simulationRelease wpi.sim.enableRelease()
}

jar {
    from { configurations.runtimeClasspath.collect { it.isDirectory() ? it : zipTree(it) } }
    manifest edu.wpi.first.gradlerio.GradleRIOPlugin.javaManifest(ROBOT_MAIN_CLASS)
    duplicatesStrategy = DuplicatesStrategy.INCLUDE
}
EOF
fi

# Copy settings.gradle from template
if [ -f "${WPILIB_HOME}/templates/settings.gradle.template" ]; then
    cp "${WPILIB_HOME}/templates/settings.gradle.template" "${PROJECT_DIR}/settings.gradle"
fi

# Create WPILib preferences
cat > "${PROJECT_DIR}/.wpilib/wpilib_preferences.json" << EOF
{
    "enableCppIntellisense": false,
    "currentLanguage": "java",
    "projectYear": "2025",
    "teamNumber": ${TEAM_NUMBER}
}
EOF

# Copy vendordeps
if [ -d "${WPILIB_HOME}/templates/vendordeps" ]; then
    cp -r "${WPILIB_HOME}/templates/vendordeps"/* "${PROJECT_DIR}/vendordeps/"
fi

# Create Main.java
cat > "${PROJECT_DIR}/src/main/java/${PACKAGE_NAME//.//}/Main.java" << EOF
package ${PACKAGE_NAME};

import edu.wpi.first.wpilibj.RobotBase;

/**
 * Do NOT add any static variables to this class, or any initialization at all. Unless you know what
 * you are doing, do not modify this file except to change the parameter class to the startRobot
 * call.
 */
public final class Main {
  private Main() {}

  /**
   * Main initialization function. Do not perform any initialization here.
   *
   * <p>If you change your main robot class, change the parameter type.
   */
  public static void main(String... args) {
    RobotBase.startRobot(Robot::new);
  }
}
EOF

# Create Robot.java
cat > "${PROJECT_DIR}/src/main/java/${PACKAGE_NAME//.//}/Robot.java" << EOF
package ${PACKAGE_NAME};

import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;

/**
 * The VM is configured to automatically run this class, and to call the functions corresponding to
 * each mode, as described in the TimedRobot documentation. If you change the name of this class or
 * the package after creating this project, you must also update the build.gradle file in the
 * project.
 */
public class Robot extends TimedRobot {
  private Command m_autonomousCommand;

  private RobotContainer m_robotContainer;

  /**
   * This function is run when the robot is first started up and should be used for any
   * initialization code.
   */
  @Override
  public void robotInit() {
    // Instantiate our RobotContainer.  This will perform all our button bindings, and put our
    // autonomous chooser on the dashboard.
    m_robotContainer = new RobotContainer();
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
    // Runs the Scheduler.  This is responsible for polling buttons, adding newly-scheduled
    // commands, running already-scheduled commands, removing finished or interrupted commands,
    // and running subsystem periodic() methods.  This must be called from the robot's periodic
    // block in order for anything in the Command-based framework to work.
    CommandScheduler.getInstance().run();
  }

  /** This function is called once each time the robot enters Disabled mode. */
  @Override
  public void disabledInit() {}

  @Override
  public void disabledPeriodic() {}

  /** This autonomous runs the autonomous command selected by your {@link RobotContainer} class. */
  @Override
  public void autonomousInit() {
    m_autonomousCommand = m_robotContainer.getAutonomousCommand();

    // schedule the autonomous command (example)
    if (m_autonomousCommand != null) {
      m_autonomousCommand.schedule();
    }
  }

  /** This function is called periodically during autonomous. */
  @Override
  public void autonomousPeriodic() {}

  @Override
  public void teleopInit() {
    // This makes sure that the autonomous stops running when
    // teleop starts running. If you want the autonomous to
    // continue until interrupted by another command, remove
    // this line or comment it out.
    if (m_autonomousCommand != null) {
      m_autonomousCommand.cancel();
    }
  }

  /** This function is called periodically during operator control. */
  @Override
  public void teleopPeriodic() {}

  @Override
  public void testInit() {
    // Cancels all running commands at the start of test mode.
    CommandScheduler.getInstance().cancelAll();
  }

  /** This function is called periodically during test mode. */
  @Override
  public void testPeriodic() {}

  /** This function is called once when the robot is first started up. */
  @Override
  public void simulationInit() {}

  /** This function is called periodically whilst in simulation. */
  @Override
  public void simulationPeriodic() {}
}
EOF

echo "Robot project '${PROJECT_NAME}' generated successfully!"
echo "Project location: ${PROJECT_DIR}"
echo ""
echo "Next steps:"
echo "1. Open the project in your IDE"
echo "2. Modify the team number in .wpilib/wpilib_preferences.json if needed"
echo "3. Start developing your robot code in Robot.java"
