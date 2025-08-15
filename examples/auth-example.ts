import { claude, Auth, setupAuth } from "@instantlyeasy/claude-code-sdk-ts";
import { createInterface } from "readline";

async function main() {
  console.log("Claude Code SDK - Authentication Example\n");

  // Method 1: setupAuth returns url and complete function
  console.log("Method 1: Setup authentication flow");
  const { url, complete } = await setupAuth(); // Defaults to ~/.claude/.credentials.json
  
  if (url) {
    // Developer decides how to handle the URL
    console.log('Please authenticate:');
    console.log('1. Open this URL in your browser:');
    console.log(`   ${url}\n`);
    console.log('2. Sign in to your Anthropic account');
    console.log('3. Authorize the application');
    console.log('4. Copy the authorization code\n');
    
    // Developer decides how to get the code
    const code = await prompt('Enter code: ');
    await complete(code);
    console.log('✅ Authentication complete!');
  } else {
    console.log('✅ Already authenticated');
  }

  // Method 2: Use with fluent API (requires auth to be set up first)
  console.log("\nMethod 2: Using withAuth() to verify credentials");
  try {
    const response = await claude()
      .withAuth() // Checks ~/.claude/.credentials.json exists
      .query('Say hello!')
      .asText();
    
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error.message);
    console.log('Run setupAuth() first to authenticate');
  }

  // Method 3: Custom credentials path with setupAuth
  console.log("\nMethod 3: Custom credentials location");
  const customAuth = await setupAuth('./my-auth.json');
  
  if (customAuth.url) {
    // In a web app, you might do:
    // window.open(customAuth.url);
    // const code = window.prompt('Enter code:');
    // await customAuth.complete(code);
    
    console.log('Auth URL:', customAuth.url);
    // Skip actual auth for demo
  }

  // Method 4: Direct Auth class for full control
  console.log("\nMethod 4: Direct Auth class usage");
  const auth = new Auth({
    credentialsPath: './advanced-auth.json',
    autoRefresh: true,
    overwriteExisting: false
  });
  
  if (await auth.isValid()) {
    console.log('✅ Valid credentials found');
    const token = await auth.getToken();
    console.log('Token preview:', token.substring(0, 20) + '...');
  } else {
    console.log('❌ No valid credentials');
    
    // Start auth flow
    const flow = await auth.login();
    console.log('Visit:', flow.url);
    // const code = await getUserInput();
    // await flow.complete(code);
  }

  // Method 5: Check if CLI is authenticated
  console.log("\nMethod 5: Check CLI authentication");
  const cliAuth = new Auth(); // Uses CLI default path
  
  if (await cliAuth.isValid()) {
    console.log('✅ CLI is authenticated');
    console.log('📍 Credentials at:', cliAuth.getCredentialsPath());
  } else {
    console.log('❌ CLI not authenticated');
    console.log('   Run setupAuth() to configure');
  }
}

// Helper function for CLI input
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

main().catch(console.error);