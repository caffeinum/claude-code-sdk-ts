import { AuthAnthropic } from './anthropic.js';
import { OAuthCredentials, validateCredentials } from './validation.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createInterface } from 'readline';

export interface AuthOptions {
  credentialsPath?: string;
  autoRefresh?: boolean;
  interactive?: boolean;
}

export interface LoginFlow {
  url: string;
  complete: (code: string) => Promise<void>;
}

/**
 * Authentication manager for Claude Code SDK
 */
export class Auth {
  private credentialsPath: string;
  private autoRefresh: boolean;

  constructor(options?: AuthOptions | string) {
    if (typeof options === 'string') {
      this.credentialsPath = this.resolvePath(options);
      this.autoRefresh = true;
    } else {
      this.credentialsPath = this.resolvePath(options?.credentialsPath || './.auth.json');
      this.autoRefresh = options?.autoRefresh ?? true;
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
      return validateCredentials(parsed);
    } catch {
      return null;
    }
  }

  /**
   * Save credentials to storage
   */
  private async saveCredentials(credentials: OAuthCredentials): Promise<void> {
    const dir = path.dirname(this.credentialsPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.credentialsPath, JSON.stringify(credentials, null, 2));
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
  public async login(mode: 'max' | 'console' = 'max'): Promise<LoginFlow> {
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
 * Interactive authentication setup
 */
export async function setupAuth(options?: AuthOptions): Promise<void> {
  const auth = new Auth(options);

  // Check if already authenticated
  if (await auth.isValid()) {
    console.log('✅ Already authenticated!');
    return;
  }

  console.log('🔐 Starting authentication setup...\n');

  // Start login flow
  const { url, complete } = await auth.login();

  console.log('📋 Please follow these steps:');
  console.log('1. Open this URL in your browser:');
  console.log(`   ${url}\n`);
  console.log('2. Sign in to your Anthropic account');
  console.log('3. Authorize the application');
  console.log('4. Copy the authorization code from the callback page\n');

  // Get code from user
  const code = await prompt('📝 Paste the authorization code here: ');
  
  try {
    await complete(code);
    console.log('\n✅ Authentication successful!');
    console.log(`🔑 Credentials stored in ${auth.getCredentialsPath()}`);
  } catch (error) {
    console.error('\n❌ Authentication failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Quick authentication helper
 */
export async function quickAuth(storage = './.auth.json'): Promise<void> {
  const auth = new Auth(storage);
  
  if (await auth.isValid()) {
    console.log('✅ Already authenticated');
    return;
  }

  const { url, complete } = await auth.login();
  console.log(`🔗 Authenticate at: ${url}`);
  
  const code = await prompt('📝 Enter code: ');
  await complete(code);
  
  console.log('✅ Authentication complete!');
}

/**
 * Helper to prompt user for input
 */
function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}