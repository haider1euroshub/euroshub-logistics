import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const sharedSrc = path.resolve(__dirname, '../../packages/shared/src');

/**
 * Vite plugin: redirect any *.js import whose resolved path falls inside
 * packages/shared/src to the corresponding *.ts file.
 *
 * Why: the shared package was compiled with "module": "NodeNext", producing
 * CJS output. Its TypeScript source files use .js extensions in import
 * specifiers (ESM convention for Node). When Vite loads the TypeScript source
 * directly it resolves those .js specifiers to the CJS-compiled files, which
 * Rollup cannot statically analyse for named exports. This plugin intercepts
 * those resolutions and substitutes the TypeScript source file instead.
 */
function sharedTsPlugin() {
  return {
    name: 'shared-js-to-ts',
    resolveId(source: string, importer: string | undefined) {
      if (!importer) return null;

      // Only act when the importer is itself inside the shared/src tree
      const normalizedImporter = importer.replace(/\\/g, '/');
      const normalizedSharedSrc = sharedSrc.replace(/\\/g, '/');
      if (!normalizedImporter.startsWith(normalizedSharedSrc)) return null;

      // Case 1: source has explicit .js extension → redirect to .ts
      if (source.endsWith('.js')) {
        const resolved = path.resolve(path.dirname(importer), source);
        const tsPath = resolved.replace(/\.js$/, '.ts');
        if (fs.existsSync(tsPath)) return tsPath;
      }

      // Case 2: extensionless relative import (e.g. './enums', '../constants')
      // Rollup would otherwise pick up the compiled .js sibling.
      if (source.startsWith('./') || source.startsWith('../')) {
        const resolved = path.resolve(path.dirname(importer), source);
        const tsPath = resolved + '.ts';
        if (fs.existsSync(tsPath)) return tsPath;
        const tsIndexPath = path.join(resolved, 'index.ts');
        if (fs.existsSync(tsIndexPath)) return tsIndexPath;
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [react(), sharedTsPlugin()],
  resolve: {
    alias: [
      // Map the public package name to the browser-safe TypeScript barrel
      // (which uses extensionless re-exports, avoiding the .js → CJS problem).
      {
        find: '@eliteship/shared',
        replacement: path.join(sharedSrc, 'browser.ts'),
      },
    ],
  },
  server: {
    port: 5173,
    host: true,
  },
});
