import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const srcRoot = path.resolve(__dirname, '..');
const allowedDdlFile = path.join(srcRoot, 'utils', 'runMigrations.ts');

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
  it('keeps DDL centralized in runMigrations.ts', () => {
    const ddlQueryPattern =
      /AppDataSource\.query\(\s*`[\s\S]*?\b(?:CREATE|ALTER|DROP)\s+(?:TABLE|INDEX|EXTENSION)\b[\s\S]*?`\s*(?:,|\))/g;

    const offenders = listTsFiles(srcRoot)
      .filter((filePath) => filePath !== allowedDdlFile)
      .filter((filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        return ddlQueryPattern.test(content);
      })
      .map((filePath) => path.relative(srcRoot, filePath).replace(/\\/g, '/'));

    expect(offenders).toEqual([]);
  });
});
