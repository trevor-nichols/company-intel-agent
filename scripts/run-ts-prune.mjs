#!/usr/bin/env node
import { spawn } from 'node:child_process';

const IGNORED_PATTERNS = [
  /\/?components\/.+\.stories\.(?:ts|tsx)$/i,
  /^app\/.*\/(?:page|layout|template|route)\.(?:ts|tsx)$/i,
  /^app\/api\/.*\/route\.ts$/i,
  /^\.next\//,
  /(?:^|\/)(tailwind|vitest)\.config\.ts$/i,
  /^components\/company-intel\/index\.ts$/i,
  /^components\/ui\/index\.ts$/i,
  /^components\/company-intel\/hooks\/index\.ts$/i,
  /^components\/company-intel\/context\/index\.ts$/i,
  /^components\/company-intel\/types\/index\.ts$/i,
  /^server\/index\.ts$/i,
  /^server\/bridge\/index\.ts$/i,
  /^server\/services\/index\.ts$/i,
  /^server\/handlers\/index\.ts$/i,
  /^server\/persistence\/index\.ts$/i,
  /^server\/reports\/CompanyIntelReportDocument\.tsx$/i,
  /^server\/transformers\/index\.ts$/i,
  /^server\/web-search\/index\.ts$/i,
  /^server\/web-search\/types\.ts$/i,
];

function normalizePathSegment(segment) {
  return segment.replace(/:\d+$/, '').trim();
}

function shouldIgnore(line) {
  const [rawPath] = line.split(' - ');
  if (!rawPath) return false;
  const filePath = normalizePathSegment(rawPath);
  return IGNORED_PATTERNS.some(pattern => pattern.test(filePath));
}

function runTsPrune() {
  return new Promise((resolve, reject) => {
    const child = spawn('ts-prune', ['--project', 'tsconfig.json'], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });

    let stdout = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', code => {
      resolve({ code, stdout });
    });
  });
}

const { stdout } = await runTsPrune();
const issues = stdout
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0 && !shouldIgnore(line));

if (issues.length > 0) {
  console.error('ts-prune found potential unused exports:\n');
  console.error(issues.join('\n'));
  process.exitCode = 1;
} else {
  console.log('ts-prune clean (storybook + Next entrypoints ignored).');
}
