#!/usr/bin/env node
const { readStdin } = require('./adapter');

readStdin()
  .then(raw => {
    // Minimal stop hook to keep stability.
    process.stdout.write(raw);
  })
  .catch(() => process.exit(0));
