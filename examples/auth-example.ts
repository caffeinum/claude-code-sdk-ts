import { AuthFileStorage, AuthAnthropic } from "@instantlyeasy/claude-code-sdk-ts";
import { createInterface } from "readline";

async function main() {
  console.log("Claude Code SDK - Authentication Example\n");

  const authStorage = new AuthFileStorage("./credentials.json");

  // Check if already authenticated
  if (await AuthAnthropic.access(authStorage)) {
    console.log("✅ Already authenticated!");

    // Show access token (first 20 chars for security)
    try {
      const token = await AuthAnthropic.access(authStorage);
      console.log(`🔑 Access token: ${token?.substring(0, 20)}...`);
      console.log("✅ Authentication working correctly!");
    } catch (error) {
      console.error("❌ Failed to get access token:", error.message);
    }
    return;
  }

  console.log("🔐 Starting authentication flow...\n");

  // Start the auth flow
  const { url, verifier } = await AuthAnthropic.authorize("max");

  console.log("📋 Please follow these steps:");
  console.log("1. Open this URL in your browser:");
  console.log(`   ${url}\n`);
  console.log("2. Sign in to your Anthropic account");
  console.log("3. Authorize the application");
  console.log("4. Copy the authorization code from the callback page\n");

  let code;
  while (true) {
    code = await askQuestion("📝 Paste the authorization code here: ");
    if (!code) {
      console.log("❌ No code provided");
      continue;
    }
    break;
  }

  try {
    console.log("🔄 Exchanging code for tokens...");
    await AuthAnthropic.exchange(code.trim(), verifier);

    console.log("✅ Authentication successful!");
    console.log("🔑 Credentials stored in " + authStorage.filepath);

    // Verify by getting access token
    const token = await AuthAnthropic.access(authStorage);
    console.log(`🎉 Access token obtained: ${token?.substring(0, 20)}...`);
  } catch (error) {
    console.error("❌ Authentication failed:", error.message);
    process.exit(1);
  }
}

function askQuestion(question) {
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
