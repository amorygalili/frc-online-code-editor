import React, {useState, useEffect} from 'react';
import {Text, Box} from 'ink';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

type Props = {
	challengeName: string;
	title?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function GenerateCommand({challengeName, title}: Props) {
	const [status, setStatus] = useState<'generating' | 'success' | 'error'>('generating');
	const [error, setError] = useState<string>('');

	useEffect(() => {
		generateProject();
	}, []);

	const generateProject = async () => {
		try {
			const challengeTitle = title || challengeName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
			const targetDir = join(process.cwd(), challengeName);

			// Create project directory
			await mkdir(targetDir, {recursive: true});

			// Template directory path
			const templateDir = join(__dirname, '../../templates/challenge-project');

			// Copy the entire template directory structure
			await copyDirectory(templateDir, targetDir, challengeName, challengeTitle);

			setStatus('success');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error occurred');
			setStatus('error');
		}
	};

	const copyDirectory = async (sourceDir: string, targetDir: string, challengeName: string, challengeTitle: string) => {
		const {readdir} = await import('node:fs/promises');

		const entries = await readdir(sourceDir, {withFileTypes: true});

		for (const entry of entries) {
			const sourcePath = join(sourceDir, entry.name);
			const targetPath = join(targetDir, entry.name);

			if (entry.isDirectory()) {
				await mkdir(targetPath, {recursive: true});
				await copyDirectory(sourcePath, targetPath, challengeName, challengeTitle);
			} else {
				// Read and process file
				const content = await readFile(sourcePath, 'utf-8');

				// Replace template variables
				const processedContent = content
					.replace(/\{\{challengeName\}\}/g, challengeName)
					.replace(/\{\{challengeTitle\}\}/g, challengeTitle);

				// Write processed file
				await writeFile(targetPath, processedContent);
			}
		}
	};

	if (status === 'generating') {
		return (
			<Box>
				<Text>⏳ Generating challenge project "{challengeName}"...</Text>
			</Box>
		);
	}

	if (status === 'error') {
		return (
			<Box flexDirection="column">
				<Text color="red">Error generating project:</Text>
				<Text color="red">{error}</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text color="green">✓ Successfully generated challenge repository!</Text>
			<Text></Text>
			<Text>Repository created at: <Text color="cyan">{challengeName}/</Text></Text>
			<Text></Text>
			<Text>Structure:</Text>
			<Text>  📁 {challengeName}/</Text>
			<Text>    📄 challenges.json</Text>
			<Text>    📁 example-challenge/</Text>
			<Text>      📄 metadata.json</Text>
			<Text>      📄 instructions.md</Text>
			<Text>      📁 robot-code/          <Text color="gray">(WPILib robot project)</Text></Text>
			<Text>      📁 sim-visualization/   <Text color="gray">(React visualization project)</Text></Text>
			<Text></Text>
			<Text>Next steps:</Text>
			<Text>  1. cd {challengeName}/example-challenge/sim-visualization</Text>
			<Text>  2. npm install</Text>
			<Text>  3. npm run dev</Text>
			<Text></Text>
			<Text>Customize your challenge:</Text>
			<Text>  • Edit <Text color="yellow">example-challenge/instructions.md</Text> for challenge instructions</Text>
			<Text>  • Edit <Text color="yellow">example-challenge/robot-code/src/main/java/frc/robot/Robot.java</Text> for starter code</Text>
			<Text>  • Edit <Text color="yellow">example-challenge/sim-visualization/src/ChallengeVisualization.tsx</Text> for visualization</Text>
			<Text></Text>
			<Text>Build for distribution:</Text>
			<Text>  • Run <Text color="yellow">npm run build</Text> in sim-visualization/ to generate dist folder</Text>
			<Text>  • Commit the entire repository to git for challenge distribution</Text>
		</Box>
	);
}
