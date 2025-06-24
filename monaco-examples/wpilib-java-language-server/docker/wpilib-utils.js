import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * WPILib utilities for managing robot projects and workspace
 */
export class WPILibUtils {
    constructor(workspaceDir = '/home/jdtls/workspace', wpilibHome = '/home/jdtls/wpilib/2025') {
        this.workspaceDir = workspaceDir;
        this.wpilibHome = wpilibHome;
        this.scriptsDir = '/home/jdtls/scripts';
    }

    /**
     * Generate a new WPILib robot project
     * @param {Object} options - Project generation options
     * @param {string} options.name - Project name
     * @param {number} options.teamNumber - FRC team number
     * @param {string} options.packageName - Java package name
     * @returns {Promise<Object>} Generation result
     */
    async generateRobotProject(options = {}) {
        const {
            name = 'RobotProject',
            teamNumber = 0,
            packageName = 'frc.robot'
        } = options;

        console.log(`Generating WPILib robot project: ${name}`);

        try {
            const scriptPath = path.join(this.scriptsDir, 'generate-robot-project.sh');
            const command = [
                scriptPath,
                '--name', name,
                '--team', teamNumber.toString(),
                '--package', packageName,
                '--workspace', this.workspaceDir
            ];

            const result = await this.executeCommand('bash', command);
            
            const projectDir = path.join(this.workspaceDir, name);
            
            // Verify project was created
            const exists = await this.directoryExists(projectDir);
            if (!exists) {
                throw new Error(`Project directory was not created: ${projectDir}`);
            }

            return {
                success: true,
                projectName: name,
                projectPath: projectDir,
                teamNumber,
                packageName,
                message: `Robot project '${name}' generated successfully`
            };
        } catch (error) {
            console.error('Error generating robot project:', error);
            return {
                success: false,
                error: error.message,
                message: `Failed to generate robot project: ${error.message}`
            };
        }
    }

    /**
     * List all robot projects in the workspace
     * @returns {Promise<Array>} List of project information
     */
    async listRobotProjects() {
        try {
            const projects = [];
            const entries = await fs.readdir(this.workspaceDir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const projectPath = path.join(this.workspaceDir, entry.name);
                    const isRobotProject = await this.isWPILibProject(projectPath);
                    
                    if (isRobotProject) {
                        const projectInfo = await this.getProjectInfo(projectPath);
                        projects.push({
                            name: entry.name,
                            path: projectPath,
                            ...projectInfo
                        });
                    }
                }
            }

            return projects;
        } catch (error) {
            console.error('Error listing robot projects:', error);
            return [];
        }
    }

    /**
     * Check if a directory contains a WPILib project
     * @param {string} projectPath - Path to check
     * @returns {Promise<boolean>} True if it's a WPILib project
     */
    async isWPILibProject(projectPath) {
        try {
            const buildGradlePath = path.join(projectPath, 'build.gradle');
            const wpilibPrefsPath = path.join(projectPath, '.wpilib', 'wpilib_preferences.json');
            
            const [buildGradleExists, wpilibPrefsExists] = await Promise.all([
                this.fileExists(buildGradlePath),
                this.fileExists(wpilibPrefsPath)
            ]);

            if (buildGradleExists) {
                const buildGradleContent = await fs.readFile(buildGradlePath, 'utf8');
                return buildGradleContent.includes('edu.wpi.first.GradleRIO') || wpilibPrefsExists;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get project information from WPILib preferences
     * @param {string} projectPath - Path to the project
     * @returns {Promise<Object>} Project information
     */
    async getProjectInfo(projectPath) {
        try {
            const prefsPath = path.join(projectPath, '.wpilib', 'wpilib_preferences.json');
            const prefsExists = await this.fileExists(prefsPath);
            
            if (prefsExists) {
                const prefsContent = await fs.readFile(prefsPath, 'utf8');
                const prefs = JSON.parse(prefsContent);
                return {
                    teamNumber: prefs.teamNumber || 0,
                    projectYear: prefs.projectYear || '2025',
                    language: prefs.currentLanguage || 'java'
                };
            }

            return {
                teamNumber: 0,
                projectYear: '2025',
                language: 'java'
            };
        } catch (error) {
            console.error('Error reading project info:', error);
            return {
                teamNumber: 0,
                projectYear: '2025',
                language: 'java'
            };
        }
    }

    /**
     * Get WPILib classpath for a project
     * @param {string} projectPath - Path to the project
     * @returns {Promise<Array>} Array of classpath entries
     */
    async getWPILibClasspath(projectPath) {
        try {
            // Run gradle dependencies task to get classpath
            const command = './gradlew dependencies --configuration compileClasspath';
            const result = await execAsync(command, { cwd: projectPath });
            
            // Parse gradle output to extract JAR files
            const lines = result.stdout.split('\n');
            const classpathEntries = [];
            
            for (const line of lines) {
                if (line.includes('.jar') && (line.includes('wpilib') || line.includes('wpilibj'))) {
                    const jarMatch = line.match(/([^\s]+\.jar)/);
                    if (jarMatch) {
                        classpathEntries.push(jarMatch[1]);
                    }
                }
            }

            return classpathEntries;
        } catch (error) {
            console.error('Error getting WPILib classpath:', error);
            // Return default WPILib classpath entries
            return [
                '/home/jdtls/wpilib/2025/maven/edu/wpi/first/wpilibj/wpilibj-java/2025.3.1/wpilibj-java-2025.3.1.jar',
                '/home/jdtls/wpilib/2025/maven/edu/wpi/first/wpiutil/wpiutil-java/2025.3.1/wpiutil-java-2025.3.1.jar',
                '/home/jdtls/wpilib/2025/maven/edu/wpi/first/wpimath/wpimath-java/2025.3.1/wpimath-java-2025.3.1.jar'
            ];
        }
    }

    /**
     * Execute a command and return the result
     * @param {string} command - Command to execute
     * @param {Array} args - Command arguments
     * @returns {Promise<Object>} Command result
     */
    async executeCommand(command, args = []) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr, code });
                } else {
                    reject(new Error(`Command failed with code ${code}: ${stderr}`));
                }
            });

            process.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Check if a file exists
     * @param {string} filePath - Path to check
     * @returns {Promise<boolean>} True if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if a directory exists
     * @param {string} dirPath - Path to check
     * @returns {Promise<boolean>} True if directory exists
     */
    async directoryExists(dirPath) {
        try {
            const stats = await fs.stat(dirPath);
            return stats.isDirectory();
        } catch {
            return false;
        }
    }

    /**
     * Create Eclipse project files for a WPILib project
     * @param {string} projectPath - Path to the project
     * @param {string} projectName - Name of the project
     * @returns {Promise<void>}
     */
    async createEclipseProjectFiles(projectPath, projectName) {
        try {
            // Create .project file
            const projectFileContent = `<?xml version="1.0" encoding="UTF-8"?>
<projectDescription>
    <name>${projectName}</name>
    <comment></comment>
    <projects>
    </projects>
    <buildSpec>
        <buildCommand>
            <name>org.eclipse.jdt.core.javabuilder</name>
            <arguments>
            </arguments>
        </buildCommand>
    </buildSpec>
    <natures>
        <nature>org.eclipse.jdt.core.javanature</nature>
    </natures>
</projectDescription>`;

            await fs.writeFile(path.join(projectPath, '.project'), projectFileContent);

            // Create .classpath file
            const classpathContent = `<?xml version="1.0" encoding="UTF-8"?>
<classpath>
    <classpathentry kind="src" path="src/main/java"/>
    <classpathentry kind="src" path="src/test/java"/>
    <classpathentry kind="con" path="org.eclipse.jdt.launching.JRE_CONTAINER"/>
    <classpathentry kind="output" path="bin"/>
</classpath>`;

            await fs.writeFile(path.join(projectPath, '.classpath'), classpathContent);

            console.log(`Eclipse project files created for ${projectName}`);
        } catch (error) {
            console.error('Error creating Eclipse project files:', error);
            throw error;
        }
    }
}

export default WPILibUtils;
