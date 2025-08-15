import { claude, setupAuth, Auth } from '@instantlyeasy/claude-code-sdk-ts';

async function main() {
  console.log('Claude Code SDK - Integrated Authentication Example\n');

  // Step 1: Setup authentication (developer handles UI)
  console.log('Step 1: Setting up authentication...');
  const { url, complete } = await setupAuth({
    overwriteExisting: false,  // Don't overwrite existing credentials
    autoRefresh: true
  });
  
  if (url) {
    // Developer decides how to handle authentication
    // In a web app:
    //   window.open(url);
    //   const code = await showModal('Enter auth code');
    //   await complete(code);
    
    // In a CLI app:
    console.log('Open this URL:', url);
    // const readline = require('readline').createInterface({
    //   input: process.stdin,
    //   output: process.stdout
    // });
    // const code = await new Promise(resolve => {
    //   readline.question('Enter code: ', answer => {
    //     readline.close();
    //     resolve(answer);
    //   });
    // });
    // await complete(code);
    
    // For this example, we'll skip actual auth
    console.log('(Skipping actual authentication for demo)\n');
  } else {
    console.log('Already authenticated!\n');
  }

  // Step 2: Use authenticated SDK
  try {
    // Simple usage - validates credentials exist
    const response1 = await claude()
      .withAuth() // Validates ~/.claude/.credentials.json exists
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
      console.log('\n❌ Not authenticated. Please run setupAuth() first\n');
      
      // Setup auth and retry
      const retryAuth = await setupAuth();
      if (retryAuth.url) {
        console.log('Please authenticate at:', retryAuth.url);
        // Handle authentication...
      }
    } else {
      console.error('Error:', error);
    }
  }

  // Step 3: Direct auth management for advanced use cases
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
    
    // Developer handles getting the code
    // const code = await getUserInput();
    // await complete(code);
  }

  // Step 4: Session with auth
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