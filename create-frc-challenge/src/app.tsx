import React from 'react';
import {Text, Box} from 'ink';
import {GenerateCommand} from './commands/GenerateCommand.js';

type Props = {
	command?: string;
	challengeName?: string;
	title?: string;
};

export default function App({command, challengeName, title}: Props) {
	if (command === 'generate') {
		if (!challengeName) {
			return (
				<Box flexDirection="column">
					<Text color="red">Error: Challenge name is required</Text>
					<Text>Usage: create-frc-challenge generate &lt;name&gt; --title "Challenge Title"</Text>
				</Box>
			);
		}

		return <GenerateCommand challengeName={challengeName} title={title} />;
	}

	// Default help message
	return (
		<Box flexDirection="column">
			<Text color="blue" bold>FRC Challenge CLI</Text>
			<Text>Generate challenge projects for FRC robot programming education.</Text>
			<Text></Text>
			<Text>Usage:</Text>
			<Text>  create-frc-challenge generate &lt;name&gt; --title "Challenge Title"</Text>
			<Text></Text>
			<Text>Example:</Text>
			<Text>  create-frc-challenge generate my-challenge --title "My Awesome Challenge"</Text>
		</Box>
	);
}
