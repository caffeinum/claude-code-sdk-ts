import { claude, setupAuth, Auth } from '@instantlyeasy/claude-code-sdk-ts';

async function main() {
  console.log('Claude Code SDK - Integrated Authentication Example\n');

  // Method 1: Quick setup with interactive flow
  // await setupAuth({ credentialsPath: './.auth.json' });

  // Method 2: Use auth with fluent API
  try {
    // Simple usage - auto loads from ./.auth.json
    const response1 = await claude()
      .withAuth() // Auto-loads from ./.auth.json
      .withModel('sonnet')
      .query('Say hello!')
      .asText();
    
    console.log('Response 1:', response1);

    // With custom credentials path
    const response2 = await claude()
      .withAuth('~/claude-project/.auth.json')
      .query('What can you help me with?')
      .asText();
    
    console.log('Response 2:', response2);

    // With full auth options
    const response3 = await claude()
      .withAuth({
        credentialsPath: './my-credentials.json',
        autoRefresh: true
      })
      .allowTools('Read', 'Grep')
      .query('Find all TODO comments in this project')
      .asText();
    
    console.log('Response 3:', response3);

  } catch (error) {
    if (error.message.includes('Not authenticated')) {
      console.log('\n❌ Not authenticated. Running setup...\n');
      
      // Run interactive setup if not authenticated
      await setupAuth({ credentialsPath: './.auth.json' });
      
      // Retry the query
      const response = await claude()
        .withAuth()
        .query('Say hello!')
        .asText();
      
      console.log('Response after auth:', response);
    } else {
      console.error('Error:', error);
    }
  }

  // Method 3: Direct auth management for advanced use cases
  const auth = new Auth('./.auth.json');
  
  if (await auth.isValid()) {
    console.log('\n✅ Direct auth check: Valid token available');
    
    // Get token for custom usage
    const token = await auth.getToken();
    console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
  } else {
    console.log('\n❌ Direct auth check: No valid token');
    
    // Start manual auth flow
    const { url, complete } = await auth.login();
    console.log('Visit:', url);
    
    // In real app, get code from user input
    // const code = await getUserInput();
    // await complete(code);
  }

  // Method 4: Session with auth
  const session = claude()
    .withAuth()
    .withModel('sonnet')
    .skipPermissions();

  const msg1 = await session.query('Pick a number between 1 and 100').asText();
  console.log('\nSession message 1:', msg1);

  const sessionId = await session.query('').getSessionId();
  const msg2 = await session
    .withSessionId(sessionId)
    .query('What number did you pick?')
    .asText();
  console.log('Session message 2:', msg2);
}

// Run the example
main().catch(console.error);