import { Plugin } from 'vite';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

/**
 * Helper function to find the hashed window-api file
 */
function findWindowApiFile(assetsDir: string): string | null {
  try {
    const files = readdirSync(assetsDir);
    const windowApiFile = files.find(file => file.startsWith('window-api-') && file.endsWith('.js'));
    return windowApiFile ? join(assetsDir, windowApiFile) : null;
  } catch {
    return null;
  }
}

export interface FrcChallengeApiPluginOptions {
  /**
   * Path to the built window-api.js file.
   * Can be a relative path from the project root or an absolute path.
   * If not provided, the plugin will try to find it in the frc-challenge-site package.
   */
  scriptPath?: string;
  
  /**
   * Whether to inject the script in the head or body.
   * Defaults to 'head'
   */
  injectTo?: 'head' | 'body';
  
  /**
   * Custom attributes to add to the script tag
   */
  scriptAttributes?: Record<string, string>;
}

/**
 * Vite plugin that injects the FRC Challenge API script into HTML files.
 * This script exposes the frcChallengeApi object globally.
 */
export function frcChallengeApiPlugin(options: FrcChallengeApiPluginOptions = {}): Plugin {
  const {
    scriptPath,
    injectTo = 'head',
    scriptAttributes = {}
  } = options;

  return {
    name: 'frc-challenge-api',
    transformIndexHtml: {
      enforce: 'pre',
      transform(html: string) {
        try {
          // Try to read the script content
          let scriptContent: string = '';
          let scriptSrc: string | undefined;

          // Determine the script path to use
          let pathsToTry: string[] = [];

          if (scriptPath) {
            pathsToTry = [scriptPath];
          } else {
            // Try to find the built window-api.js with hash in common locations
            const possibleDirs = [
              'node_modules/frc-challenge-site/dist/assets',
              'dist/assets'
            ];

            for (const dir of possibleDirs) {
              const foundFile = findWindowApiFile(resolve(process.cwd(), dir));
              if (foundFile) {
                pathsToTry.push(foundFile);
                break;
              }
            }

            // Fallback paths if hashed file not found
            if (pathsToTry.length === 0) {
              pathsToTry = [
                'node_modules/frc-challenge-site/dist/assets/window-api.js',
                'dist/assets/window-api.js'
              ];
            }
          }

          let foundPath: string | undefined;
          for (const tryPath of pathsToTry) {
            try {
              const fullPath = resolve(process.cwd(), tryPath);
              scriptContent = readFileSync(fullPath, 'utf-8');
              foundPath = tryPath;
              break;
            } catch (error) {
              // Continue to next path
            }
          }

          if (!foundPath) {
            // If no file found, use the first path as src attribute
            const fallbackPath = pathsToTry[0];
            console.warn(`FRC Challenge API script not found, will use src attribute: ${fallbackPath}`);
            scriptSrc = fallbackPath;
            scriptContent = '';
          }

          // Build script attributes
          const attrs = Object.entries(scriptAttributes)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ');

          // Create the script tag
          let scriptTag: string;
          if (scriptSrc) {
            // Use src attribute if file couldn't be read
            scriptTag = `<script src="${scriptSrc}"${attrs ? ' ' + attrs : ''}></script>`;
          } else {
            // Inline the script content
            scriptTag = `<script${attrs ? ' ' + attrs : ''}>\n${scriptContent}\n</script>`;
          }

          // Inject into head or body
          if (injectTo === 'head') {
            return html.replace(
              /<head>/i,
              `<head>\n  ${scriptTag}`
            );
          } else {
            return html.replace(
              /<body>/i,
              `<body>\n  ${scriptTag}`
            );
          }
        } catch (error) {
          console.error('Error in frc-challenge-api plugin:', error);
          return html;
        }
      }
    }
  };
}

export default frcChallengeApiPlugin;
