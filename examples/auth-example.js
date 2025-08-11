import { startAuth, isAuthenticated, getAccessToken, logout } from '@instantlyeasy/claude-code-sdk-ts';
import { createInterface } from 'readline';

async function main() {
  console.log('Claude Code SDK - Authentication Example\n');

  // Check if already authenticated
  if (await isAuthenticated()) {
    console.log('✅ Already authenticated!');
    
    const choice = await askQuestion('Do you want to logout? (y/n): ');
    if (choice.toLowerCase() === 'y') {
      await logout();
      console.log('✅ Logged out successfully');
      return;
    }
    
    // Show access token (first 20 chars for security)
    try {
      const token = await getAccessToken();
      console.log(`🔑 Access token: ${token.substring(0, 20)}...`);
      console.log('✅ Authentication working correctly!');
    } catch (error) {
      console.error('❌ Failed to get access token:', error.message);
    }
    return;
  }

  console.log('🔐 Starting authentication flow...\n');

  // Start the auth flow
  const { url, waitForCode } = startAuth();
  
  console.log('📋 Please follow these steps:');
  console.log('1. Open this URL in your browser:');
  console.log(`   ${url}\n`);
  console.log('2. Sign in to your Anthropic account');
  console.log('3. Authorize the application');
  console.log('4. Copy the authorization code from the callback URL\n');

  // Wait for user to paste the code
  const code = await askQuestion('📝 Paste the authorization code here: ');
  
  try {
    console.log('🔄 Exchanging code for tokens...');
    await waitForCode(code.trim());
    
    console.log('✅ Authentication successful!');
    console.log('🔑 Credentials stored in ~/.claude/credentials.json');
    
    // Verify by getting access token
    const token = await getAccessToken();
    console.log(`🎉 Access token obtained: ${token.substring(0, 20)}...`);
    
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }
}

function askQuestion(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

main().catch(console.error);