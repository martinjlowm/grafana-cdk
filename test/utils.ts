import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Runs `body` against a fresh temporary directory and removes it afterwards.
 *
 * `mkdtemp` is given a prefix under the platform's temp directory rather than a
 * hardcoded `/tmp`, and the directory is created per invocation rather than per
 * module load — the previous version created one when the module was imported,
 * so every test in a file shared it and a failure left it behind.
 */
export function withTemporaryDirectory(body: (tmpdir: string) => void | Promise<void>): () => Promise<void> {
  return async () => {
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'grafana-cdk-'));

    try {
      await body(tmpdir);
    } finally {
      fs.rmSync(tmpdir, { recursive: true, force: true });
    }
  };
}
