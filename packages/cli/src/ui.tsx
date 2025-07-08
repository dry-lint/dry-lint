import React, { useEffect, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import path from 'path';
import { DupGroup, findDuplicates } from '@dry-lint/dry-lint';
import { globby } from 'globby';

export function DryUIRender({
  state,
  groups,
  cursor,
}: {
  state: 'scanning' | 'done';
  groups: DupGroup[];
  cursor: number;
}) {
  if (state === 'scanning') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Scanning…
        </Text>
      </Box>
    );
  }

  if (!groups.length) {
    return <Text color="green">✅ No duplicate declarations found!</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text color="yellow">{groups.length} duplicate groups (↑/↓ navigate, ⏎ show, q quit)</Text>
      {groups.map((g, i) => (
        <Text key={i} inverse={i === cursor} wrap="truncate-end">
          {Math.round(g.similarity * 100)}% – {g.decls[0]!.location.name} ↔{' '}
          {g.decls[1]!.location.name}
        </Text>
      ))}
    </Box>
  );
}

/**
 * Props for the DryUI component.
 * @property projectPath - Root path of the project to scan for duplicates
 * @property threshold - Similarity threshold (0-1) for duplicate detection
 */
export function DryUI({ projectPath, threshold }: { projectPath: string; threshold: number }) {
  // UI state: 'scanning' while detecting duplicates, 'done' after completion
  const [state, setState] = useState<'scanning' | 'done'>('scanning');
  // List of duplicate groups found
  const [groups, setGroups] = useState<DupGroup[]>([]);
  // Cursor index for navigating the duplicate groups list
  const [cursor, setCursor] = useState(0);
  // Ink hook to programmatically exit the app
  const { exit } = useApp();

  // Effect to scan project files and detect duplicates when component mounts
  useEffect(() => {
    (async () => {
      // Find all .ts/.tsx files under the project directory
      const filePaths = await globby(['**/*.{ts,tsx}'], {
        cwd: projectPath,
        absolute: true,
      });
      // Run duplicate detection with given threshold
      const result = await findDuplicates(filePaths, { threshold });
      // Update state with results
      setGroups(result);
      setState('done');
    })();
  }, [projectPath, threshold]);

  // Handle keyboard input for navigation and actions
  useInput((input, key) => {
    if (state !== 'done') return;
    if (key.upArrow) setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(groups.length - 1, c + 1));
    if (key.return && groups[cursor]) printGroup(groups[cursor]);
    if (key.escape || input === 'q') exit();
  });

  // Display list of duplicate groups with navigation instructions
  return <DryUIRender state={state} groups={groups} cursor={cursor} />;
}

/**
 * Prints detailed information for a duplicate group to the console.
 * @param g - Duplicate group to print
 */
export function printGroup(g: DupGroup) {
  console.log('\n' + '─'.repeat(60));
  console.log(`Group similarity: ${(g.similarity * 100).toFixed(0)}%`);
  g.decls.forEach(d =>
    console.log(' •', path.relative(process.cwd(), d.location.file), d.location.name)
  );
  console.log('─'.repeat(60));
}
