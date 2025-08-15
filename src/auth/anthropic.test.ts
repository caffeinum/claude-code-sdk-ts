import { describe, it, expect, beforeEach } from 'vitest';
import { AnthropicAuth } from './anthropic.js';

describe('AnthropicAuth', () => {
  let auth: AnthropicAuth;

  beforeEach(() => {
    auth = new AnthropicAuth();
  });

  describe('authorize', () => {
    it('should generate authorization URL with proper parameters', () => {
      const result = auth.authorize();
      
      expect(result.url).toContain('https://claude.ai/oauth/authorize');
      expect(result.url).toContain('code=true');
      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e');
      expect(result.url).toContain('redirect_uri=https%3A%2F%2Fconsole.anthropic.com%2Foauth%2Fcode%2Fcallback');
      expect(result.url).toContain('scope=org%3Acreate_api_key+user%3Aprofile+user%3Ainference');
      expect(result.url).toContain('code_challenge_method=S256');
      
      expect(result.codeVerifier).toBeDefined();
      expect(typeof result.codeVerifier).toBe('string');
      expect(result.codeVerifier.length).toBeGreaterThan(0);
    });

    it('should generate different code verifiers on each call', () => {
      const result1 = auth.authorize();
      const result2 = auth.authorize();
      
      expect(result1.codeVerifier).not.toBe(result2.codeVerifier);
    });
  });

  describe('constructor', () => {
    it('should use default client ID when none provided', () => {
      const auth = new AnthropicAuth();
      const result = auth.authorize();
      
      expect(result.url).toContain('client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e');
    });

    it('should use custom client ID when provided', () => {
      const customClientId = 'custom-client-id';
      const auth = new AnthropicAuth({ clientId: customClientId });
      const result = auth.authorize();
      
      expect(result.url).toContain(`client_id=${customClientId}`);
    });
  });
});