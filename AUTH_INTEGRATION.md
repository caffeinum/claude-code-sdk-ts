# Authentication Integration Guide

This document describes the authentication module added to the Claude Code SDK, which provides programmatic OAuth authentication that integrates seamlessly with the Claude CLI.

## How It Works

The authentication module writes credentials to `~/.claude/.credentials.json` by default - the same location used by the Claude CLI. This means:

1. **Single Authentication**: Authenticate once, use everywhere (SDK and CLI)
2. **CLI Integration**: The Claude CLI automatically uses these credentials
3. **No Token Injection Needed**: The SDK works through the CLI which reads the credentials

## Available Components

### 1. Core OAuth Implementation (`AuthAnthropic`)

Low-level OAuth PKCE flow implementation:

```typescript
import { AuthAnthropic } from '@instantlyeasy/claude-code-sdk-ts';

// Start OAuth flow
const { url, verifier } = await AuthAnthropic.authorize("max");
console.log('Visit:', url);

// Exchange code for tokens
const tokens = await AuthAnthropic.exchange(authCode, verifier);

// Refresh tokens
const refreshed = await AuthAnthropic.refresh(tokens.refresh);
```

### 2. Authentication Manager (`Auth`)

High-level authentication management with automatic token refresh:

```typescript
import { Auth } from '@instantlyeasy/claude-code-sdk-ts';

const auth = new Auth('./.auth.json');

// Check if authenticated
if (await auth.isValid()) {
  const token = await auth.getToken(); // Auto-refreshes if needed
}

// Start login flow
const { url, complete } = await auth.login();
console.log('Visit:', url);
await complete(authCode);
```

### 3. Setup Helpers

Interactive authentication setup:

```typescript
import { setupAuth, quickAuth } from '@instantlyeasy/claude-code-sdk-ts';

// Interactive setup with prompts
await setupAuth({
  credentialsPath: './.auth.json',
  autoRefresh: true
});

// Quick auth (one-liner)
await quickAuth('./.auth.json');
```

### 4. Validation Utilities

Zod schemas for credential validation:

```typescript
import { validateCredentials, isValidCredentials } from '@instantlyeasy/claude-code-sdk-ts';

// Validate credentials
const creds = validateCredentials(data);

// Type guard
if (isValidCredentials(data)) {
  // data is typed as OAuthCredentials
}
```

## Storage Options

Users can choose where to store credentials:

- **Default (Recommended)**: `~/.claude/.credentials.json` - Integrates with Claude CLI
- **Project-local**: `./.auth.json` - For project-specific auth (won't work with CLI)
- **Custom path**: Any specified location

### Important Notes

1. **Existing Credentials**: By default, the auth module will NOT overwrite existing credentials. Use `overwriteExisting: true` to replace them.

2. **CLI Compatibility**: Only credentials stored in `~/.claude/.credentials.json` will be automatically used by the Claude CLI.

3. **Format**: The module automatically handles the CLI's credential format (wrapped in "anthropic" key).

## Usage Examples

See the complete examples:
- `examples/auth-example.ts` - Basic authentication flow
- `examples/auth-integrated.ts` - Integration patterns (future)

## Future Integration

To fully integrate with the fluent API, we would need to:

1. Modify the internal client to accept API keys directly
2. Update the QueryBuilder to inject tokens before making requests
3. Handle async token retrieval in the synchronous query chain

For now, users can:
1. Use `setupAuth()` to authenticate once
2. The CLI will use the stored credentials automatically
3. Or manage tokens manually for custom integrations

## API Reference

### Auth Class

```typescript
class Auth {
  constructor(options?: AuthOptions | string)
  
  isValid(): Promise<boolean>
  getToken(): Promise<string>
  login(mode?: 'max' | 'console'): Promise<LoginFlow>
  logout(): Promise<void>
  getCredentialsPath(): string
}
```

### Setup Functions

```typescript
setupAuth(options?: AuthOptions): Promise<void>
quickAuth(storage?: string): Promise<void>
```

### Types

```typescript
interface AuthOptions {
  credentialsPath?: string;
  autoRefresh?: boolean;
  interactive?: boolean;
}

interface LoginFlow {
  url: string;
  complete: (code: string) => Promise<void>;
}

interface OAuthCredentials {
  type: 'oauth';
  refresh: string;
  access: string;
  expires: number;
}
```