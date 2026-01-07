#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(
	`
	Usage
	  $ create-frc-challenge <command>

	Commands
	  generate <name>    Generate a new challenge project

	Options
	  --title <title>    Challenge title (for generate command)
	  --help             Show help

	Examples
	  $ create-frc-challenge generate my-challenge --title "My Awesome Challenge"
`,
	{
		importMeta: import.meta,
		flags: {
			title: {
				type: 'string',
			},
			help: {
				type: 'boolean',
				alias: 'h',
			},
		},
	},
);

const command = cli.input[0];
const challengeName = cli.input[1];

render(<App command={command} challengeName={challengeName} title={cli.flags.title} />);
