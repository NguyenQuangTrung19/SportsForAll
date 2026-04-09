#!/usr/bin/env node
const { readStdin, hookEnabled } = require('./adapter');

readStdin()
  .then(raw => {
    try {
      const input = JSON.parse(raw || '{}');
      const cmd = String(input.command || input.args?.command || '');

      if (hookEnabled('pre:shell:no-force-push', ['minimal', 'standard', 'strict']) && /\bgit\s+push\s+--force\b/.test(cmd)) {
        console.error('[SFA Hook] BLOCKED: Không dùng git push --force.');
        process.exit(2);
      }

      if (hookEnabled('pre:shell:dangerous-delete', ['standard', 'strict']) && /(rm\s+-rf\s+\/|Remove-Item\s+.*-Recurse\s+-Force\s+\/?\s*$)/i.test(cmd)) {
        console.error('[SFA Hook] WARNING: Lệnh xóa mạnh, vui lòng kiểm tra lại đường dẫn.');
      }
    } catch {
      // noop
    }

    process.stdout.write(raw);
  })
  .catch(() => process.exit(0));
