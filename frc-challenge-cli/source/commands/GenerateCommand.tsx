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
			
			// Files to copy and process
			const files = [
				'package.json',
				'index.html',
				'vite.config.ts',
				'tsconfig.json',
				'tsconfig.node.json',
				'README.md',
				'src/main.tsx',
				'src/ChallengeVisualization.tsx',
				'src/vite-env.d.ts'
			];
			
			// Process each file
			for (const file of files) {
				const templatePath = join(templateDir, file);
				const targetPath = join(targetDir, file);
				
				// Create directory if needed
				await mkdir(dirname(targetPath), {recursive: true});
				
				// Read template file
				const content = await readFile(templatePath, 'utf-8');
				
				// Replace template variables
				const processedContent = content
					.replace(/\{\{challengeName\}\}/g, challengeName)
					.replace(/\{\{challengeTitle\}\}/g, challengeTitle);
				
				// Write processed file
				await writeFile(targetPath, processedContent);
			}
			
			setStatus('success');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error occurred');
			setStatus('error');
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
			<Text color="green">✓ Successfully generated challenge project!</Text>
			<Text></Text>
			<Text>Project created at: <Text color="cyan">{challengeName}/</Text></Text>
			<Text></Text>
			<Text>Next steps:</Text>
			<Text>  1. cd {challengeName}</Text>
			<Text>  2. npm install</Text>
			<Text>  3. npm run dev</Text>
			<Text></Text>
			<Text>Edit <Text color="yellow">src/ChallengeVisualization.tsx</Text> to customize your challenge visualization.</Text>
			<Text>Run <Text color="yellow">npm run build</Text> to generate the dist folder for challenge distribution.</Text>
		</Box>
	);
}
