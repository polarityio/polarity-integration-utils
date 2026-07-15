import fs from 'fs';
import path from 'path';

/**
 * Architectural invariant (revised G4, INT-2020): the production import graph
 * must never reach into the `testing` sub-path. Fixtures and replay logic live
 * only under `lib/testing/`; if any production module imported them, replay code
 * (and potentially fixtures) would ship in the production artifact.
 *
 * This guards it structurally: every `.ts` under `lib/` that is NOT itself in
 * `lib/testing/` must not import a `testing` path. That covers the seam removal
 * (production `run()` no longer references replay code) and prevents regressions.
 *
 * Exception: `*.docs.ts` files (e.g. `index.docs.ts`) are the api-extractor /
 * typedoc aggregation entrypoints. They intentionally include `./testing` for
 * documentation, are not referenced by the package's `.` runtime export (which
 * maps to `index.ts`, and `index.ts` deliberately omits testing), and are never
 * on a consumer's runtime import path. They are excluded from this scan.
 */
const LIB_DIR = path.join(__dirname, '..', '..', 'lib');
const TESTING_DIR = path.join(LIB_DIR, 'testing');

/** Docs/aggregation entrypoints that legitimately reference testing. */
const isDocsAggregation = (file: string): boolean => file.endsWith('.docs.ts');

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** Captures the module specifier of `from '…'`, `import '…'`, `require('…')`. */
const IMPORT_SPECIFIER = /\b(?:from|import|require)\b\s*\(?\s*['"]([^'"]+)['"]/g;

/** True when a module specifier resolves into a `testing` path. */
function referencesTesting(specifier: string): boolean {
  return /(^|\/)testing($|\/)/.test(specifier);
}

describe('production import graph', () => {
  it('no module outside lib/testing imports the testing sub-path', () => {
    const productionFiles = walkTsFiles(LIB_DIR).filter(
      (file) => !file.startsWith(TESTING_DIR + path.sep) && !isDocsAggregation(file)
    );

    const offenders: string[] = [];
    for (const file of productionFiles) {
      const source = fs.readFileSync(file, 'utf8');
      let match: RegExpExecArray | null;
      IMPORT_SPECIFIER.lastIndex = 0;
      while ((match = IMPORT_SPECIFIER.exec(source)) !== null) {
        if (referencesTesting(match[1])) {
          offenders.push(`${path.relative(LIB_DIR, file)} -> ${match[1]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('finds production files to scan (guards against a broken walk)', () => {
    const productionFiles = walkTsFiles(LIB_DIR).filter(
      (file) => !file.startsWith(TESTING_DIR + path.sep) && !isDocsAggregation(file)
    );
    expect(productionFiles.length).toBeGreaterThan(0);
    expect(productionFiles.some((f) => f.endsWith(path.join('requests', 'polarity-request.ts')))).toBe(
      true
    );
  });
});
