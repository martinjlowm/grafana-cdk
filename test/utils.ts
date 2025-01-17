import fs from 'node:fs';

function withTemporaryDirectory(func: (tmpdir: string) => void): Parameters<jest.It>[1];
function withTemporaryDirectory<T>(func: (tmpdir: string) => Promise<T>): Parameters<jest.It>[1];
function withTemporaryDirectory<T>(func: (tmpdir: string) => T): Parameters<jest.It>[1] {
  const tmpdir = fs.mkdtempSync('/tmp/cdk-grafana');

  return async () => {
    try {
      await func(tmpdir);
    } finally {
      fs.rmSync(tmpdir, { recursive: true });
    }
  };
}

export { withTemporaryDirectory };
