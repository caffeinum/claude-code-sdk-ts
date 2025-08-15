import { AuthAnthropic } from './anthropic.js';
import { OAuthCredentials, validateCredentials } from './validation.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface AuthOptions {
  credentialsPath?: string;
  autoRefresh?: boolean;
  interactive?: boolean;
  overwriteExisting?: boolean; // Explicit permission to overwrite existing credentials
}

export interface AuthFlow {
  url: string;
  complete: (code: string) => Promise<void>;
}

/**
 * Authentication manager for Claude Code SDK
 * 
 * By default, writes to ~/.claude/.credentials.json to integrate with Claude CLI.
 * This allows the CLI to use the same authentication.
 */
export class Auth {
  private credentialsPath: string;
  private autoRefresh: boolean;
  private overwriteExisting: boolean;
  
  // Default to Claude CLI's credentials location
  private static readonly CLAUDE_CLI_CREDENTIALS = '~/.claude/.credentials.json';

  constructor(options?: AuthOptions | string) {
    if (typeof options === 'string') {
      this.credentialsPath = this.resolvePath(options);
      this.autoRefresh = true;
      this.overwriteExisting = false;
    } else {
      // Default to Claude CLI credentials path for seamless integration
      this.credentialsPath = this.resolvePath(
        options?.credentialsPath || Auth.CLAUDE_CLI_CREDENTIALS
      );
      this.autoRefresh = options?.autoRefresh ?? true;
      this.overwriteExisting = options?.overwriteExisting ?? false;
    }
  }

  /**
   * Resolve path (handle ~ for home directory)
   */
  private resolvePath(filepath: string): string {
    if (filepath.startsWith('~/')) {
      return path.join(os.homedir(), filepath.slice(2));
    }
    return path.resolve(filepath);
  }

  /**
   * Load credentials from storage
   */
  private async loadCredentials(): Promise<OAuthCredentials | null> {
    try {
      const data = await fs.readFile(this.credentialsPath, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Handle Claude CLI format (wrapped in "anthropic" key)
      const creds = parsed.anthropic || parsed;
      
      return validateCredentials(creds);
    } catch {
      return null;
    }
  }

  /**
   * Save credentials to storage
   */
  private async saveCredentials(credentials: OAuthCredentials): Promise<void> {
    // Check if credentials already exist
    const existing = await this.loadCredentials();
    if (existing && !this.overwriteExisting) {
      throw new Error(
        `Credentials already exist at ${this.credentialsPath}. ` +
        `Use overwriteExisting: true to replace them, or use the existing credentials.`
      );
    }

    const dir = path.dirname(this.credentialsPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Format for Claude CLI compatibility
    const cliFormat = {
      anthropic: credentials
    };
    
    await fs.writeFile(this.credentialsPath, JSON.stringify(cliFormat, null, 2));
    await fs.chmod(this.credentialsPath, 0o600);
  }

  /**
   * Check if authentication is valid (not expired)
   */
  public async isValid(): Promise<boolean> {
    const creds = await this.loadCredentials();
    if (!creds) return false;
    
    // Check if token is still valid (with 5 minute buffer)
    return creds.expires > Date.now() + 300000;
  }

  /**
   * Get access token (auto-refresh if needed)
   */
  public async getToken(): Promise<string> {
    const creds = await this.loadCredentials();
    if (!creds) {
      throw new Error('Not authenticated. Run setupAuth() or auth.login() first.');
    }

    // Check if token needs refresh (5 minute buffer)
    if (creds.expires <= Date.now() + 300000) {
      if (this.autoRefresh) {
        const refreshed = await AuthAnthropic.refresh(creds.refresh);
        const newCreds: OAuthCredentials = {
          type: 'oauth',
          refresh: refreshed.refresh,
          access: refreshed.access,
          expires: refreshed.expires,
        };
        await this.saveCredentials(newCreds);
        return refreshed.access;
      } else {
        throw new Error('Token expired. Enable autoRefresh or manually refresh.');
      }
    }

    return creds.access;
  }

  /**
   * Start login flow
   */
  public async login(mode: 'max' | 'console' = 'max'): Promise<AuthFlow> {
    const { url, verifier } = await AuthAnthropic.authorize(mode);

    const complete = async (code: string) => {
      const tokens = await AuthAnthropic.exchange(code.trim(), verifier);
      const credentials: OAuthCredentials = {
        type: 'oauth',
        refresh: tokens.refresh,
        access: tokens.access,
        expires: tokens.expires,
      };
      await this.saveCredentials(credentials);
    };

    return { url, complete };
  }

  /**
   * Clear stored credentials
   */
  public async logout(): Promise<void> {
    try {
      await fs.unlink(this.credentialsPath);
    } catch {
      // File doesn't exist, already logged out
    }
  }

  /**
   * Get credentials path
   */
  public getCredentialsPath(): string {
    return this.credentialsPath;
  }
}

/**
 * Setup authentication flow - returns URL and complete function for developer to handle
 * 
 * @param options Authentication options
 * @returns Object with url to open and complete function to call with the code
 * 
 * @example
 * ```typescript
 * const { url, complete } = await setupAuth();
 * window.open(url); // or console.log(url) in CLI
 * const code = await getUserInput(); // however you want to get it
 * await complete(code);
 * ```
 */
export async function setupAuth(options?: AuthOptions | string): Promise<AuthFlow> {
  const auth = new Auth(options);
  
  // Check if already authenticated
  if (await auth.isValid() && !auth['overwriteExisting']) {
    // Return a no-op flow if already authenticated
    return {
      url: '',
      complete: async () => {
        console.log('Already authenticated');
      }
    };
  }
  
  // Return the login flow for developer to handle
  return auth.login();
}

