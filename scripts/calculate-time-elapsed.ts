#!/usr/bin/env -S npx tsx

/**
 * Reads lines from stdin containing date/time entries and calculates
 * elapsed time between consecutive entries.
 *
 * Input format: "M/D HH:MM am/pm [optional words]"
 * Example:
 *   5/3 12:25 pm foo
 *   5/2 9:45 am bar
 *
 * Output:
 *   Prints each line followed by the elapsed time since the previous entry
 */

interface ParsedEntry {
  line: string;
  timestamp: Date;
}

function parseLine(line: string): ParsedEntry | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  // Match pattern: M/D HH:MM am/pm [optional words]
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s+(am|pm)/i);
  if (!match) {
    return null;
  }

  const [, monthStr, dayStr, hourStr, minuteStr, ampm] = match;
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  const date = new Date();
  date.setMonth(month - 1, day);
  date.setHours(hour, minute, 0, 0);

  // Adjust for AM/PM
  if (ampm.toLowerCase() === 'pm' && hour !== 12) {
    date.setHours(date.getHours() + 12);
  } else if (ampm.toLowerCase() === 'am' && hour === 12) {
    date.setHours(0);
  }

  return { line: trimmed, timestamp: date };
}

function formatElapsedTime(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  if (minutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
}

async function main(): Promise<void> {
  const lines: string[] = [];
  
  // Read from stdin
  for await (const chunk of process.stdin) {
    lines.push(chunk.toString());
  }

  const input = lines.join('');
  const inputLines = input.split('\n');
  const entries: ParsedEntry[] = [];

  for (const line of inputLines) {
    const parsed = parseLine(line);
    if (parsed) {
      entries.push(parsed);
    }
  }

  if (entries.length === 0) {
    console.error('No valid date/time entries found');
    process.exit(1);
  }

  // Print first line (no elapsed time before it)
  console.log(entries[0].line);

  for (let i = 1; i < entries.length; i++) {
    const current = entries[i];
    const previous = entries[i - 1];
    const elapsedMs = Math.abs(current.timestamp.getTime() - previous.timestamp.getTime());
    
    console.log(formatElapsedTime(elapsedMs));
    console.log(current.line);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
