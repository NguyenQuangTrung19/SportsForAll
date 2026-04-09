#!/usr/bin/env node
/**
 * Minimal Cursor hook adapter for SportsForAll.
 * Keep it small and robust to avoid hook conflicts.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const MAX_STDIN = 1024 * 1024;

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
    });
    process.stdin.on('end', () => resolve(data));
  });
}

function transformToClaude(cursorInput, overrides = {}) {
  return {
    tool_input: {
      command: cursorInput.command || cursorInput.args?.command || '',
      file_path: cursorInput.path || cursorInput.file || cursorInput.args?.filePath || '',
      ...overrides.tool_input,
    },
    tool_output: {
      output: cursorInput.output || cursorInput.result || '',
      ...overrides.tool_output,
    },
    transcript_path: cursorInput.transcript_path || cursorInput.transcriptPath || cursorInput.session?.transcript_path || '',
  };
}

function runExistingHook(scriptName, stdinData) {
  const scriptPath = path.join(process.cwd(), '.cursor', 'scripts', 'hooks', scriptName);
  try {
    execFileSync('node', [scriptPath], {
      input: typeof stdinData === 'string' ? stdinData : JSON.stringify(stdinData),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
      cwd: process.cwd(),
    });
  } catch (e) {
    if (e && e.status === 2) process.exit(2);
  }
}

function hookEnabled(hookId, allowedProfiles = ['standard', 'strict']) {
  const rawProfile = String(process.env.ECC_HOOK_PROFILE || 'standard').toLowerCase();
  const profile = ['minimal', 'standard', 'strict'].includes(rawProfile) ? rawProfile : 'standard';

  const disabled = new Set(
    String(process.env.ECC_DISABLED_HOOKS || '')
      .split(',')
      .map(v => v.trim().toLowerCase())
      .filter(Boolean)
  );

  if (disabled.has(String(hookId || '').toLowerCase())) return false;
  return allowedProfiles.includes(profile);
}

module.exports = { readStdin, transformToClaude, runExistingHook, hookEnabled };
