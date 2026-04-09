#!/usr/bin/env node
const { readStdin } = require('./adapter');

readStdin()
  .then(raw => {
    try {
      const input = JSON.parse(raw || '{}');
      const filePath = String(input.path || input.file || '');

      if (/\.(ts|tsx|js|jsx)$/.test(filePath)) {
        // Gentle reminder only, avoid heavy cross-script dependency
        // to prevent hook collision and flaky behavior.
      }
    } catch {
      // noop
    }

    process.stdout.write(raw);
  })
  .catch(() => process.exit(0));
