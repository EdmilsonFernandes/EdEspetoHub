import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const srcRoot = path.resolve(__dirname, '..');
const allowedDdlFiles = new Set([
  path.join(srcRoot, 'utils', 'runMigrations.ts'),
  path.join(srcRoot, 'utils', 'migrationRunner.ts'),
]);
const allowedDdlDirs = [path.join(srcRoot, 'migrations') + path.sep];

function listTsFiles(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('schema governance', () => {
  it('keeps DDL centralized in runMigrations.ts and versioned migrations', () => {
    const ddlQueryPattern =
      /\b(?:AppDataSource|queryRunner)\.query\(\s*`[\s\S]*?\b(?:CREATE|ALTER|DROP)\s+(?:TABLE|INDEX|EXTENSION)\b[\s\S]*?`\s*(?:,|\))/g;

    const offenders = listTsFiles(srcRoot)
      .filter((filePath) => !filePath.endsWith('.test.ts'))
      .filter((filePath) => !allowedDdlFiles.has(filePath))
      .filter((filePath) => !allowedDdlDirs.some((dirPath) => filePath.startsWith(dirPath)))
      .filter((filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        ddlQueryPattern.lastIndex = 0;
        return ddlQueryPattern.test(content);
      })
      .map((filePath) => path.relative(srcRoot, filePath).replace(/\\/g, '/'));

    expect(offenders).toEqual([]);
  });
});
