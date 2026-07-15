#!/usr/bin/env node
/** pokedocs CLI entry point — commands arrive with their milestones (see src/index.ts). */

import { COMMANDS } from './index.js';

const command = process.argv[2];
console.error(
  command && (COMMANDS as readonly string[]).includes(command)
    ? `pokedocs ${command} is not implemented yet — follow along at github.com/wbaxterh/pokedocs`
    : `pokedocs — agent-native docs tooling. Commands (coming soon): ${COMMANDS.join(', ')}`,
);
process.exit(1);
