import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * WPILib utilities for managing robot projects and workspace
 */
export class WPILibUtils {
    constructor(workspaceDir = '/home/frcuser/workspace', wpilibHome = '/home/frcuser/wpilib/2025') {
        this.workspaceDir = workspaceDir;
        this.wpilibHome = wpilibHome;
        this.scriptsDir = '/home/frcuser/scripts';

        // Build management
        this.buildClients = new Set();
        this.buildProcesses = new Map(); // buildId -> process info
        this.buildSubscriptions = new Map(); // buildId -> Set of WebSocket clients
        this.builds = new Map(); // buildId -> build info

        // Simulation management
        this.simulationClients = new Set();
        this.simulations = new Map(); // simulationId -> simulation info
        this.simulationSubscriptions = new Map(); // simulationId -> Set of WebSocket clients
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
                '/home/frcuser/wpilib/2025/maven/edu/wpi/first/wpilibj/wpilibj-java/2025.3.1/wpilibj-java-2025.3.1.jar',
                '/home/frcuser/wpilib/2025/maven/edu/wpi/first/wpiutil/wpiutil-java/2025.3.1/wpiutil-java-2025.3.1.jar',
                '/home/frcuser/wpilib/2025/maven/edu/wpi/first/wpimath/wpimath-java/2025.3.1/wpimath-java-2025.3.1.jar'
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

    /**
     * Build a WPILib project
     * @param {string} projectPath - Path to the project
     * @param {string} task - Gradle task to run (build, clean, deploy, etc.)
     * @param {string} buildId - Unique build identifier
     * @returns {Promise<Object>} Build result
     */
    async buildProject(projectPath, task = 'build', buildId) {
        try {
            console.log(`Starting build for project at ${projectPath}, task: ${task}, buildId: ${buildId}`);

            const gradlewPath = path.join(projectPath, './gradlew');
            const gradlewExists = await this.fileExists(gradlewPath);

            if (!gradlewExists) {
                throw new Error('Gradle wrapper not found in project');
            }

            // Start build process
            const buildProcess = spawn('./gradlew', [task, '--console=plain'], {
                cwd: projectPath,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            const buildInfo = {
                buildId,
                projectPath,
                task,
                process: buildProcess,
                status: 'running',
                startTime: new Date().toISOString(),
                output: []
            };

            this.buildProcesses.set(buildId, buildInfo);

            // Handle build output
            buildProcess.stdout.on('data', (data) => {
                const output = data.toString();
                buildInfo.output.push({ type: 'stdout', content: output, timestamp: new Date().toISOString() });
                this.broadcastBuildOutput(buildId, { type: 'stdout', content: output, timestamp: new Date().toISOString() });
            });

            buildProcess.stderr.on('data', (data) => {
                const output = data.toString();
                buildInfo.output.push({ type: 'stderr', content: output, timestamp: new Date().toISOString() });
                this.broadcastBuildOutput(buildId, { type: 'stderr', content: output, timestamp: new Date().toISOString() });
            });

            buildProcess.on('close', (code) => {
                buildInfo.status = code === 0 ? 'success' : 'failed';
                buildInfo.exitCode = code;
                buildInfo.endTime = new Date().toISOString();

                this.broadcastBuildOutput(buildId, {
                    type: 'status',
                    status: buildInfo.status,
                    exitCode: code,
                    timestamp: new Date().toISOString()
                });

                console.log(`Build ${buildId} completed with code ${code}`);
            });

            buildProcess.on('error', (error) => {
                buildInfo.status = 'error';
                buildInfo.error = error.message;
                buildInfo.endTime = new Date().toISOString();

                this.broadcastBuildOutput(buildId, {
                    type: 'error',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });

                console.error(`Build ${buildId} error:`, error);
            });

            return {
                success: true,
                buildId,
                status: 'started',
                message: `Build started for task: ${task}`
            };

        } catch (error) {
            console.error('Error starting build:', error);
            return {
                success: false,
                error: error.message,
                message: `Failed to start build: ${error.message}`
            };
        }
    }

    /**
     * Get build status
     * @param {string} buildId - Build identifier
     * @returns {Promise<Object>} Build status
     */
    async getBuildStatus(buildId) {
        const buildInfo = this.buildProcesses.get(buildId);
        if (!buildInfo) {
            return { error: 'Build not found' };
        }

        return {
            buildId,
            status: buildInfo.status,
            task: buildInfo.task,
            startTime: buildInfo.startTime,
            endTime: buildInfo.endTime,
            exitCode: buildInfo.exitCode,
            error: buildInfo.error,
            outputLines: buildInfo.output.length
        };
    }

    /**
     * Add a WebSocket client for build output streaming
     * @param {WebSocket} ws - WebSocket client
     */
    addBuildClient(ws) {
        this.buildClients.add(ws);
    }

    /**
     * Remove a WebSocket client
     * @param {WebSocket} ws - WebSocket client
     */
    removeBuildClient(ws) {
        this.buildClients.delete(ws);

        // Remove from all build subscriptions
        for (const [buildId, clients] of this.buildSubscriptions.entries()) {
            clients.delete(ws);
            if (clients.size === 0) {
                this.buildSubscriptions.delete(buildId);
            }
        }
    }

    /**
     * Subscribe a client to a specific build
     * @param {WebSocket} ws - WebSocket client
     * @param {string} buildId - Build identifier
     */
    subscribeToBuild(ws, buildId) {
        console.log(`Subscribing client to build ${buildId}`);

        if (!this.buildSubscriptions.has(buildId)) {
            this.buildSubscriptions.set(buildId, new Set());
            console.log(`Created new subscription set for build ${buildId}`);
        }
        this.buildSubscriptions.get(buildId).add(ws);

        console.log(`Client subscribed to build ${buildId}. Total subscribers: ${this.buildSubscriptions.get(buildId).size}`);

        // Send existing output if build exists
        const buildInfo = this.buildProcesses.get(buildId);
        if (buildInfo && buildInfo.output.length > 0) {
            console.log(`Sending ${buildInfo.output.length} existing output lines to client`);
            ws.send(JSON.stringify({
                type: 'build_history',
                buildId,
                output: buildInfo.output
            }));
        } else {
            console.log(`No existing output for build ${buildId}`);
        }
    }

    /**
     * Broadcast build output to subscribed clients
     * @param {string} buildId - Build identifier
     * @param {Object} message - Message to broadcast
     */
    broadcastBuildOutput(buildId, message) {
        const clients = this.buildSubscriptions.get(buildId);
        console.log(`Broadcasting to ${clients ? clients.size : 0} clients for build ${buildId}:`, message);

        if (!clients) {
            console.log(`No clients subscribed to build ${buildId}`);
            return;
        }

        const broadcastMessage = JSON.stringify({
            type: 'build_output',
            buildId,
            ...message
        });

        console.log(`Sending message to ${clients.size} clients:`, broadcastMessage);

        for (const client of clients) {
            if (client.readyState === client.OPEN) {
                try {
                    client.send(broadcastMessage);
                    console.log('Message sent successfully to client');
                } catch (error) {
                    console.error('Error sending build output to client:', error);
                    this.removeBuildClient(client);
                }
            } else {
                console.log('Client WebSocket not open, readyState:', client.readyState);
            }
        }
    }

    /**
     * Start robot simulation
     * @param {string} projectPath - Path to the WPILib project
     * @param {string} simulationType - Type of simulation ('debug', 'release', 'external-debug', 'external-release')
     * @param {string} simulationId - Unique identifier for this simulation
     * @returns {Promise<Object>} Simulation result
     */
    async startSimulation(projectPath, simulationType = 'debug', simulationId) {
        console.log(`Starting simulation for project: ${projectPath}, type: ${simulationType}, id: ${simulationId}`);

        // Clean up any existing simulations first
        await this.cleanupAllSimulations();

        // Map simulation types to Gradle tasks
        const taskMap = {
            'debug': 'simulateJavaDebug',
            'release': 'simulateJavaRelease',
            'external-debug': 'simulateExternalJavaDebug',
            'external-release': 'simulateExternalJavaRelease',
            'basic': 'simulateJava'
        };

        const gradleTask = taskMap[simulationType] || 'simulateJavaDebug';

        try {
            // Check if project exists and is a WPILib project
            if (!await this.isWPILibProject(projectPath)) {
                return {
                    success: false,
                    error: 'Not a valid WPILib project'
                };
            }

            // Create simulation info object
            const simulationInfo = {
                id: simulationId,
                projectPath,
                simulationType,
                gradleTask,
                status: 'starting',
                startTime: new Date().toISOString(),
                output: [],
                process: null
            };

            this.simulations.set(simulationId, simulationInfo);

            // Start the simulation process
            const simulationProcess = spawn('./gradlew', [gradleTask], {
                cwd: projectPath,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    DISPLAY: ':1' // Use the virtual display for GUI
                }
            });

            simulationInfo.process = simulationProcess;
            simulationInfo.status = 'running';

            // Handle simulation output
            simulationProcess.stdout.on('data', (data) => {
                const output = data.toString();
                simulationInfo.output.push({ type: 'stdout', content: output, timestamp: new Date().toISOString() });
                this.broadcastSimulationOutput(simulationId, { type: 'stdout', content: output, timestamp: new Date().toISOString() });
            });

            simulationProcess.stderr.on('data', (data) => {
                const output = data.toString();
                simulationInfo.output.push({ type: 'stderr', content: output, timestamp: new Date().toISOString() });
                this.broadcastSimulationOutput(simulationId, { type: 'stderr', content: output, timestamp: new Date().toISOString() });
            });

            simulationProcess.on('close', (code) => {
                simulationInfo.status = code === 0 ? 'stopped' : 'failed';
                simulationInfo.exitCode = code;
                simulationInfo.endTime = new Date().toISOString();

                this.broadcastSimulationOutput(simulationId, {
                    type: 'status',
                    status: simulationInfo.status,
                    exitCode: code,
                    timestamp: new Date().toISOString()
                });

                console.log(`Simulation ${simulationId} ended with code ${code}`);
            });

            simulationProcess.on('error', (error) => {
                simulationInfo.status = 'error';
                simulationInfo.error = error.message;
                simulationInfo.endTime = new Date().toISOString();

                this.broadcastSimulationOutput(simulationId, {
                    type: 'error',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });

                console.error(`Simulation ${simulationId} error:`, error);
            });

            return {
                success: true,
                simulationId,
                message: 'Simulation started successfully'
            };

        } catch (error) {
            console.error('Error starting simulation:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Stop robot simulation
     * @param {string} simulationId - Simulation identifier
     * @returns {Promise<Object>} Stop result
     */
    async stopSimulation(simulationId) {
        console.log(`Stopping simulation: ${simulationId}`);

        const simulationInfo = this.simulations.get(simulationId);
        if (!simulationInfo) {
            return {
                success: false,
                error: 'Simulation not found'
            };
        }

        try {
            if (simulationInfo.process && !simulationInfo.process.killed) {
                simulationInfo.process.kill('SIGTERM');

                // Force kill after 5 seconds if it doesn't stop gracefully
                setTimeout(() => {
                    if (simulationInfo.process && !simulationInfo.process.killed) {
                        simulationInfo.process.kill('SIGKILL');
                    }
                }, 5000);
            }

            simulationInfo.status = 'stopped';
            simulationInfo.endTime = new Date().toISOString();

            this.broadcastSimulationOutput(simulationId, {
                type: 'status',
                status: 'stopped',
                timestamp: new Date().toISOString()
            });

            return {
                success: true,
                message: 'Simulation stopped successfully'
            };

        } catch (error) {
            console.error('Error stopping simulation:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Clean up all running simulations and related processes
     * @returns {Promise<void>}
     */
    async cleanupAllSimulations() {
        console.log('Cleaning up all existing simulations...');

        // Stop all tracked simulations
        const simulationIds = Array.from(this.simulations.keys());
        const stopPromises = simulationIds.map(id => this.stopSimulation(id));
        await Promise.all(stopPromises);

        // Kill any remaining Java processes that might be simulation-related
        try {
            // Kill any remaining Gradle daemon processes
            await this.killProcessByPattern('gradle.*daemon');
            await this.killProcessByPattern('GradleDaemon');

            // Kill any remaining robot simulation processes
            await this.killProcessByPattern('frc.robot.Main');
            await this.killProcessByPattern('edu.wpi.first.wpilibj');
            await this.killProcessByPattern('halsim');

            // Kill HAL simulation related processes more aggressively (matching start.sh)
            await this.killProcessByPattern('wpilibws');
            await this.killProcessByPattern('WPILibWebSocket');
            await this.killProcessByPattern('HALSim');
            await this.killProcessByPattern('SimulationExtension');
            await this.killProcessByPattern('NetworkTablesExtension');

            // Kill any Java processes that might be HAL simulation clients (matching start.sh)
            await this.killProcessByPattern('java.*halsim');
            await this.killProcessByPattern('java.*wpilibws');
            await this.killProcessByPattern('java.*simulation');

            // Kill processes using simulation ports (comprehensive range matching start.sh)
            // HAL WebSocket port range (3300-3310)
            await this.killProcessesByPortRange(3300, 3310);

            // NT4 port range (5800-5820)
            await this.killProcessesByPortRange(5800, 5820);

            // NT3 port
            await this.killProcessByPort(1735);

            console.log('Simulation cleanup completed');

            // Wait longer for processes to fully terminate (matching start.sh)
            await new Promise(resolve => setTimeout(resolve, 3000));

        } catch (error) {
            console.error('Error during simulation cleanup:', error);
        }
    }

    /**
     * Kill processes matching a pattern
     * @param {string} pattern - Process name pattern
     * @returns {Promise<void>}
     */
    async killProcessByPattern(pattern) {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');

            // First, let's see what processes match the pattern
            const pgrep = spawn('pgrep', ['-f', pattern]);
            let matchingPids = '';

            pgrep.stdout.on('data', (data) => {
                matchingPids += data.toString();
            });

            pgrep.on('close', () => {
                if (matchingPids.trim()) {
                    console.log(`Found processes matching pattern '${pattern}': ${matchingPids.trim().split('\n').join(', ')}`);
                }

                // Now kill the processes
                const pkill = spawn('pkill', ['-f', pattern]);

                pkill.on('close', (killCode) => {
                    if (killCode === 0 && matchingPids.trim()) {
                        console.log(`Successfully killed processes matching pattern: ${pattern}`);
                    }
                    resolve();
                });

                pkill.on('error', () => {
                    console.log(`No processes found matching pattern: ${pattern}`);
                    resolve();
                });
            });

            pgrep.on('error', () => {
                // pgrep failed, just try pkill anyway
                const pkill = spawn('pkill', ['-f', pattern]);
                pkill.on('close', () => resolve());
                pkill.on('error', () => resolve());
            });
        });
    }

    /**
     * Kill processes using a specific port
     * @param {number} port - Port number
     * @returns {Promise<void>}
     */
    async killProcessByPort(port) {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');

            // Use lsof to find processes using the port, then kill them
            const lsof = spawn('lsof', ['-ti', `:${port}`]);
            let pids = '';

            lsof.stdout.on('data', (data) => {
                pids += data.toString();
            });

            lsof.on('close', () => {
                if (pids.trim()) {
                    const pidList = pids.trim().split('\n').filter(pid => pid);
                    pidList.forEach(pid => {
                        try {
                            process.kill(parseInt(pid), 'SIGKILL');
                            console.log(`Killed process ${pid} using port ${port}`);
                        } catch (error) {
                            // Process might already be dead
                        }
                    });
                }
                resolve();
            });

            lsof.on('error', () => {
                // lsof might not be available or no processes found
                resolve();
            });
        });
    }

    /**
     * Kill processes using ports in a specific range
     * @param {number} startPort - Starting port number
     * @param {number} endPort - Ending port number
     * @returns {Promise<void>}
     */
    async killProcessesByPortRange(startPort, endPort) {
        const promises = [];
        for (let port = startPort; port <= endPort; port++) {
            promises.push(this.killProcessByPort(port));
        }
        await Promise.all(promises);
    }

    /**
     * Get simulation status
     * @param {string} simulationId - Simulation identifier
     * @returns {Object|null} Simulation information or null if not found
     */
    getSimulationStatus(simulationId) {
        const simulation = this.simulations.get(simulationId);
        if (!simulation) {
            return null;
        }

        // Return simulation info without the process object (not serializable)
        return {
            id: simulation.id,
            projectPath: simulation.projectPath,
            simulationType: simulation.simulationType,
            gradleTask: simulation.gradleTask,
            status: simulation.status,
            startTime: simulation.startTime,
            endTime: simulation.endTime,
            exitCode: simulation.exitCode,
            error: simulation.error,
            output: simulation.output
        };
    }

    /**
     * Broadcast simulation output to subscribed clients
     * @param {string} simulationId - Simulation identifier
     * @param {Object} message - Message to broadcast
     */
    broadcastSimulationOutput(simulationId, message) {
        const clients = this.simulationSubscriptions.get(simulationId);
        console.log(`Broadcasting simulation output to ${clients ? clients.size : 0} clients for simulation ${simulationId}:`, message);

        if (!clients) {
            console.log(`No clients subscribed to simulation ${simulationId}`);
            return;
        }

        const broadcastMessage = JSON.stringify({
            type: 'simulation_output',
            simulationId,
            ...message
        });

        console.log(`Sending simulation message to ${clients.size} clients:`, broadcastMessage);

        for (const client of clients) {
            if (client.readyState === client.OPEN) {
                try {
                    client.send(broadcastMessage);
                    console.log('Simulation message sent successfully to client');
                } catch (error) {
                    console.error('Error sending simulation output to client:', error);
                    this.removeSimulationClient(client);
                }
            } else {
                console.log('Client connection not open, removing from simulation subscriptions');
                this.removeSimulationClient(client);
            }
        }
    }

    /**
     * Subscribe a client to simulation output
     * @param {string} simulationId - Simulation identifier
     * @param {WebSocket} client - WebSocket client
     */
    subscribeToSimulation(simulationId, client) {
        if (!this.simulationSubscriptions.has(simulationId)) {
            this.simulationSubscriptions.set(simulationId, new Set());
        }

        this.simulationSubscriptions.get(simulationId).add(client);
        console.log(`Client subscribed to simulation ${simulationId}. Total subscribers: ${this.simulationSubscriptions.get(simulationId).size}`);

        // Send existing output if simulation exists
        const simulationInfo = this.simulations.get(simulationId);
        if (simulationInfo && simulationInfo.output.length > 0) {
            console.log(`Sending existing simulation output (${simulationInfo.output.length} messages) to new subscriber`);

            try {
                client.send(JSON.stringify({
                    type: 'simulation_history',
                    simulationId,
                    output: simulationInfo.output
                }));
            } catch (error) {
                console.error('Error sending simulation history to client:', error);
            }
        } else {
            console.log(`No existing output for simulation ${simulationId}`);
        }
    }

    /**
     * Add a WebSocket client for simulation output streaming
     * @param {WebSocket} ws - WebSocket client
     */
    addSimulationClient(ws) {
        this.simulationClients.add(ws);
    }

    /**
     * Remove a WebSocket client from simulation subscriptions
     * @param {WebSocket} ws - WebSocket client
     */
    removeSimulationClient(ws) {
        this.simulationClients.delete(ws);

        // Remove from all simulation subscriptions
        for (const [simulationId, clients] of this.simulationSubscriptions.entries()) {
            clients.delete(ws);
            if (clients.size === 0) {
                this.simulationSubscriptions.delete(simulationId);
            }
        }
    }
}

export default WPILibUtils;
