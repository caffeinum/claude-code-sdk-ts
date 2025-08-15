import { claude, Auth } from "@instantlyeasy/claude-code-sdk-ts";

async function main() {
  console.log("Claude Code SDK - Authentication Example\n");

  // Method 1: Simplest approach - auto-handles authentication
  // This will prompt for authentication if needed, then execute the query
  console.log("Method 1: Using withAuth() for automatic authentication");
  try {
    const response = await claude()
      .withAuth() // Automatically handles auth to ~/.claude/credentials.json
      .query('Say hello!')
      .asText();
    
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error);
  }

  // Method 2: Custom credentials path
  console.log("\nMethod 2: Using custom credentials path");
  try {
    const response = await claude()
      .withAuth('./my-auth.json') // Custom credentials location
      .query('What can you help with?')
      .asText();
    
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error);
  }

  // Method 3: Direct auth management for advanced use cases
  console.log("\nMethod 3: Direct auth management");
  const auth = new Auth('./advanced-auth.json');
  
  if (await auth.isValid()) {
    console.log('✅ Already authenticated');
    const token = await auth.getToken();
    console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
  } else {
    console.log('❌ Not authenticated');
    
    // Manual authentication flow
    const { url, complete } = await auth.login();
    console.log('Visit:', url);
    console.log('\nFollow the steps:');
    console.log('1. Sign in to your Anthropic account');
    console.log('2. Authorize the application');
    console.log('3. Copy the authorization code\n');
    
    // In a real app, you'd get the code from user input
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
  }

  // Method 4: Check CLI integration
  console.log("\nMethod 4: CLI Integration Check");
  const cliAuth = new Auth(); // Defaults to ~/.claude/credentials.json
  
  if (await cliAuth.isValid()) {
    console.log('✅ CLI credentials are valid');
    console.log('📍 Path:', cliAuth.getCredentialsPath());
  } else {
    console.log('❌ No CLI credentials found');
    console.log('   Run a query with .withAuth() to set them up');
  }
}

main().catch(console.error);