import { AnthropicAuth, type AuthCredentials, type AuthOptions } from './anthropic.js';

export interface AuthFlowResult {
  url: string;
  waitForCode: (code: string) => Promise<void>;
}

export class ClaudeAuth {
  private auth: AnthropicAuth;

  constructor(options?: AuthOptions) {
    this.auth = new AnthropicAuth(options);
  }

  /**
   * Start the authentication flow
   * Returns the authorization URL and a function to complete the flow
   */
  public startAuthFlow(): AuthFlowResult {
    const { url, codeVerifier } = this.auth.authorize();
    
    const waitForCode = async (code: string) => {
      const credentials = await this.auth.exchange(code, codeVerifier);
      await this.auth.storeCredentials(credentials);
    };

    return {
      url,
      waitForCode
    };
  }

  /**
   * Get a valid access token
   */
  public async getAccessToken(): Promise<string> {
    return this.auth.access();
  }

  /**
   * Check if user is authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    return this.auth.isAuthenticated();
  }

  /**
   * Logout and clear stored credentials
   */
  public async logout(): Promise<void> {
    return this.auth.logout();
  }

  /**
   * Get stored credentials (for advanced use cases)
   */
  public async getCredentials(): Promise<AuthCredentials | null> {
    return this.auth.loadCredentials();
  }
}

// Export types and classes
export { AnthropicAuth, ExchangeFailed } from './anthropic.js';
export type { AuthCredentials, AuthOptions } from './anthropic.js';

// Create a default instance for convenience
export const auth = new ClaudeAuth();

/**
 * Convenience function to start auth flow
 */
export function startAuth(options?: AuthOptions): AuthFlowResult {
  const claudeAuth = new ClaudeAuth(options);
  return claudeAuth.startAuthFlow();
}

/**
 * Convenience function to get access token
 */
export async function getAccessToken(options?: AuthOptions): Promise<string> {
  const claudeAuth = new ClaudeAuth(options);
  return claudeAuth.getAccessToken();
}

/**
 * Convenience function to check authentication status
 */
export async function isAuthenticated(options?: AuthOptions): Promise<boolean> {
  const claudeAuth = new ClaudeAuth(options);
  return claudeAuth.isAuthenticated();
}

/**
 * Convenience function to logout
 */
export async function logout(options?: AuthOptions): Promise<void> {
  const claudeAuth = new ClaudeAuth(options);
  return claudeAuth.logout();
}