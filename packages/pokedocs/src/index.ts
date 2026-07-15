/**
 * pokedocs — the CLI (PRD F1.7, F2.1, F5.2).
 *
 * Commands land milestone by milestone:
 *   deploy init  — scaffold deploy artifacts per platform (M1, S1.7.1/S1.7.2)
 *   check        — the docs linter for what a green build won't catch (M2, F2.1)
 *   export pdf   — themed PDF export driven by the real sidebar (M5, S5.2.1)
 *   mcp          — optional local docs MCP server (M3, S3.3.2)
 *
 * Design constraint (PRD Open Question 5): Docusaurus CLI commands are not
 * natively site-context-aware; commands here likely consume context cached
 * at build time.
 */

export const COMMANDS = ['check', 'export', 'deploy', 'mcp'] as const;
export type PokedocsCommand = (typeof COMMANDS)[number];
