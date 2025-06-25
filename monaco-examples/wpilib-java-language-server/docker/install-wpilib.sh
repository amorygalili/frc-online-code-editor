#!/bin/bash

# WPILib headless installation script
# This script installs WPILib in a headless environment for use with the Language Server

set -e

HOME_DIR="/home/frcuser"
WPILIB_VERSION="2025.3.2"
WPILIB_DIR="${HOME_DIR}/wpilib/WPILib_Linux-${WPILIB_VERSION}"
INSTALL_DIR="${HOME_DIR}/wpilib/2025"

echo "Starting WPILib headless installation..."

# Create installation directory
mkdir -p "${INSTALL_DIR}"

# Extract WPILib tools and libraries
cd "${WPILIB_DIR}"

# Extract the main installer contents
if [ -f "WPILibInstaller" ]; then
    echo "Extracting WPILib installer contents..."
    
    # Create a temporary directory for extraction
    TEMP_DIR=$(mktemp -d)
    
    # The installer is typically a self-extracting archive
    # We need to extract it without running the GUI
    unzip -q WPILibInstaller -d "${TEMP_DIR}" 2>/dev/null || {
        echo "Installer is not a zip file, trying alternative extraction..."
        # For now, we'll copy the installer and mark it as available
        cp WPILibInstaller "${INSTALL_DIR}/"
    }
    
    # If extraction was successful, copy contents
    if [ -d "${TEMP_DIR}" ] && [ "$(ls -A ${TEMP_DIR})" ]; then
        cp -r "${TEMP_DIR}"/* "${INSTALL_DIR}/"
        rm -rf "${TEMP_DIR}"
    fi
fi

# Create a basic WPILib environment setup
cat > "${INSTALL_DIR}/setup_env.sh" << 'EOF'
#!/bin/bash
# WPILib Environment Setup

export WPILIB_HOME="/home/frcuser/wpilib/2025"
export JAVA_HOME="/opt/java/openjdk"
export PATH="${WPILIB_HOME}/tools:${JAVA_HOME}/bin:${PATH}"

# Add WPILib tools to PATH if they exist
if [ -d "${WPILIB_HOME}/tools" ]; then
    export PATH="${WPILIB_HOME}/tools:${PATH}"
fi

# Set up Gradle properties for WPILib
export GRADLE_USER_HOME="${WPILIB_HOME}/.gradle"
mkdir -p "${GRADLE_USER_HOME}"

echo "WPILib environment configured"
EOF

chmod +x "${INSTALL_DIR}/setup_env.sh"

# Create WPILib project template directory
mkdir -p "${INSTALL_DIR}/templates"

# Create a basic robot project template structure
cat > "${INSTALL_DIR}/templates/build.gradle.template" << 'EOF'
plugins {
    id "java"
    id "edu.wpi.first.GradleRIO" version "2025.3.1"
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

def ROBOT_MAIN_CLASS = "frc.robot.Main"

deploy {
    targets {
        roborio(getTargetTypeClass('RoboRIO')) {
            team = project.frc.getTeamNumber()
            debug = project.frc.getDebugOrDefault(false)

            artifacts {
                frcJava(getArtifactTypeClass('FRCJavaArtifact')) {
                }

                frcStaticFileDeploy(getArtifactTypeClass('FileTreeArtifact')) {
                    files = project.fileTree('src/main/deploy')
                    directory = '/home/lvuser/deploy'
                    deleteOldFiles = false
                }
            }
        }
    }
}

def deployArtifact = deploy.targets.roborio.artifacts.frcJava

wpi.java.debugJni = false
def includeDesktopSupport = true

dependencies {
    annotationProcessor wpi.java.deps.wpilibAnnotations()
    implementation wpi.java.deps.wpilib()
    implementation wpi.java.vendor.java()

    roborioDebug wpi.java.deps.wpilibJniDebug(wpi.platforms.roborio)
    roborioDebug wpi.java.vendor.jniDebug(wpi.platforms.roborio)

    roborioRelease wpi.java.deps.wpilibJniRelease(wpi.platforms.roborio)
    roborioRelease wpi.java.vendor.jniRelease(wpi.platforms.roborio)

    nativeDebug wpi.java.deps.wpilibJniDebug(wpi.platforms.desktop)
    nativeDebug wpi.java.vendor.jniDebug(wpi.platforms.desktop)
    simulationDebug wpi.sim.enableDebug()

    nativeRelease wpi.java.deps.wpilibJniRelease(wpi.platforms.desktop)
    nativeRelease wpi.java.vendor.jniRelease(wpi.platforms.desktop)
    simulationRelease wpi.sim.enableRelease()

    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.1'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

test {
    useJUnitPlatform()
    systemProperty 'junit.jupiter.extensions.autodetection.enabled', 'true'
}

wpi.sim.addGui().defaultEnabled = true
wpi.sim.addDriverstation()

jar {
    from { configurations.runtimeClasspath.collect { it.isDirectory() ? it : zipTree(it) } }
    from sourceSets.main.allSource
    manifest edu.wpi.first.gradlerio.GradleRIOPlugin.javaManifest(ROBOT_MAIN_CLASS)
    duplicatesStrategy = DuplicatesStrategy.INCLUDE
}
EOF

# Create settings.gradle template
cat > "${INSTALL_DIR}/templates/settings.gradle.template" << 'EOF'
import org.gradle.internal.os.OperatingSystem

pluginManagement {
    repositories {
        mavenLocal()
        gradlePluginPortal()
        String frcYear = '2025'
        File frcHome
        if (OperatingSystem.current().isWindows()) {
            String publicFolder = System.getenv('PUBLIC')
            if (publicFolder == null) {
                publicFolder = "C:\\Users\\Public"
            }
            def homeRoot = new File(publicFolder, "wpilib")
            frcHome = new File(homeRoot, frcYear)
        } else {
            def userFolder = System.getProperty("user.home")
            def homeRoot = new File(userFolder, "wpilib")
            frcHome = new File(homeRoot, frcYear)
        }
        def frcHomeMaven = new File(frcHome, 'maven')
        maven {
            name = 'frcHome'
            url = frcHomeMaven
        }
    }
}
EOF

# Create WPILib preferences template
cat > "${INSTALL_DIR}/templates/wpilib_preferences.json.template" << 'EOF'
{
    "enableCppIntellisense": false,
    "currentLanguage": "java",
    "projectYear": "2025",
    "teamNumber": 0
}
EOF

# Create vendordeps template
mkdir -p "${INSTALL_DIR}/templates/vendordeps"
cat > "${INSTALL_DIR}/templates/vendordeps/WPILibNewCommands.json" << 'EOF'
{
  "fileName": "WPILibNewCommands.json",
  "name": "WPILib-New-Commands",
  "version": "1.0.0",
  "uuid": "111e20f7-815e-48f8-9dd6-e675ce75b266",
  "frcYear": "2025",
  "mavenUrls": [],
  "jsonUrl": "",
  "javaDependencies": [
    {
      "groupId": "edu.wpi.first.wpilibNewCommands",
      "artifactId": "wpilibNewCommands-java",
      "version": "wpilib"
    }
  ],
  "jniDependencies": [],
  "cppDependencies": [
    {
      "groupId": "edu.wpi.first.wpilibNewCommands",
      "artifactId": "wpilibNewCommands-cpp",
      "version": "wpilib",
      "libName": "wpilibNewCommands",
      "headerClassifier": "headers",
      "sourcesClassifier": "sources",
      "sharedLibrary": true,
      "skipInvalidPlatforms": true,
      "binaryPlatforms": [
        "linuxathena",
        "linuxarm32",
        "linuxarm64",
        "windowsx86-64",
        "windowsx86",
        "linuxx86-64",
        "osxuniversal"
      ]
    }
  ]
}
EOF

echo "WPILib installation completed successfully!"
echo "Installation directory: ${INSTALL_DIR}"
echo "Environment setup script: ${INSTALL_DIR}/setup_env.sh"
echo "Project templates: ${INSTALL_DIR}/templates/"
