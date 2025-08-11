import { randomBytes, createHash } from 'crypto';
import { homedir } from 'os';
import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import fetch from 'node-fetch';

export interface AuthCredentials {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface AuthOptions {
  mode?: 'max' | 'console';
  clientId?: string;
  redirectUri?: string;
}

export class ExchangeFailed extends Error {
  constructor(message: string, public response?: any) {
    super(message);
    this.name = 'ExchangeFailed';
  }
}

export class AnthropicAuth {
  private static readonly DEFAULT_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
  private static readonly REDIRECT_URI = 'https://localhost:9000/callback';
  private static readonly SCOPES = ['org:create_api_key', 'user:profile', 'user:inference'];
  private static readonly CREDENTIALS_PATH = join(homedir(), '.claude', 'credentials.json');

  private clientId: string;

  constructor(options: AuthOptions = {}) {
    this.clientId = options.clientId || AnthropicAuth.DEFAULT_CLIENT_ID;
  }

  /**
   * Generate PKCE challenge and verifier
   */
  private generatePKCE() {
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    return {
      codeVerifier,
      codeChallenge
    };
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  public authorize(): { url: string; codeVerifier: string } {
    const { codeVerifier, codeChallenge } = this.generatePKCE();
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: AnthropicAuth.REDIRECT_URI,
      scope: AnthropicAuth.SCOPES.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: randomBytes(16).toString('hex')
    });

    const url = `https://console.anthropic.com/oauth/authorize?${params.toString()}`;
    
    return { url, codeVerifier };
  }

  /**
   * Exchange authorization code for tokens
   */
  public async exchange(code: string, codeVerifier: string): Promise<AuthCredentials> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      redirect_uri: AnthropicAuth.REDIRECT_URI,
      code,
      code_verifier: codeVerifier
    });

    try {
      const response = await fetch('https://console.anthropic.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new ExchangeFailed(`Token exchange failed: ${response.status}`, errorData);
      }

      const data = await response.json() as any;
      
      if (!data.access_token || !data.refresh_token) {
        throw new ExchangeFailed('Invalid token response: missing required tokens');
      }

      const expiresAt = Date.now() + (data.expires_in * 1000);

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt
      };
    } catch (error) {
      if (error instanceof ExchangeFailed) {
        throw error;
      }
      throw new ExchangeFailed(`Network error during token exchange: ${error}`);
    }
  }

  /**
   * Refresh expired access token
   */
  public async refresh(refreshToken: string): Promise<AuthCredentials> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      refresh_token: refreshToken
    });

    try {
      const response = await fetch('https://console.anthropic.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new ExchangeFailed(`Token refresh failed: ${response.status}`, errorData);
      }

      const data = await response.json() as any;
      const expiresAt = Date.now() + (data.expires_in * 1000);

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_at: expiresAt
      };
    } catch (error) {
      if (error instanceof ExchangeFailed) {
        throw error;
      }
      throw new ExchangeFailed(`Network error during token refresh: ${error}`);
    }
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  public async access(): Promise<string> {
    const credentials = await this.loadCredentials();
    
    if (!credentials) {
      throw new Error('No stored credentials found. Please authenticate first.');
    }

    // Check if token is expired (with 5-minute buffer)
    const isExpired = Date.now() > (credentials.expires_at - 300000);
    
    if (!isExpired) {
      return credentials.access_token;
    }

    // Refresh the token
    const newCredentials = await this.refresh(credentials.refresh_token);
    await this.storeCredentials(newCredentials);
    
    return newCredentials.access_token;
  }

  /**
   * Store credentials to ~/.claude/credentials.json
   */
  public async storeCredentials(credentials: AuthCredentials): Promise<void> {
    try {
      // Ensure the .claude directory exists
      await mkdir(join(homedir(), '.claude'), { recursive: true });
      
      // Write credentials to file
      await writeFile(
        AnthropicAuth.CREDENTIALS_PATH,
        JSON.stringify(credentials, null, 2),
        { mode: 0o600 } // Restrict access to owner only
      );
    } catch (error) {
      throw new Error(`Failed to store credentials: ${error}`);
    }
  }

  /**
   * Load credentials from ~/.claude/credentials.json
   */
  public async loadCredentials(): Promise<AuthCredentials | null> {
    try {
      const data = await readFile(AnthropicAuth.CREDENTIALS_PATH, 'utf8');
      return JSON.parse(data) as AuthCredentials;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw new Error(`Failed to load credentials: ${error}`);
    }
  }

  /**
   * Check if user is authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    try {
      const credentials = await this.loadCredentials();
      return credentials !== null;
    } catch {
      return false;
    }
  }

  /**
   * Clear stored credentials
   */
  public async logout(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.unlink(AnthropicAuth.CREDENTIALS_PATH);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw new Error(`Failed to clear credentials: ${error}`);
      }
    }
  }
}