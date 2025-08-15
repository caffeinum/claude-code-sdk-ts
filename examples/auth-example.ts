import {
  AuthFileStorage,
  AuthAnthropic,
} from "../src/index";
import { createInterface } from "readline";

async function main() {
  console.log("Claude Code SDK - Authentication Example\n");

  const authStorage = new AuthFileStorage("./credentials.json");
  
  // Helper function to get valid access token
  async function getAccessToken() {
    const info = await authStorage.get("anthropic");
    if (!info || info.type !== "oauth") return null;
    
    // Check if access token is still valid
    if (info.access && info.expires > Date.now()) {
      return info.access;
    }
    
    // Refresh the token
    try {
      const credentials = await AuthAnthropic.refresh(info.refresh);
      await authStorage.set("anthropic", {
        type: "oauth",
        refresh: credentials.refresh,
        access: credentials.access,
        expires: credentials.expires,
      });
      return credentials.access;
    } catch (error) {
      console.error("❌ Failed to refresh token:", error.message);
      return null;
    }
  }

  // Check if already authenticated
  const existingToken = await getAccessToken();
  if (existingToken) {
    console.log("✅ Already authenticated!");
    console.log(`🔑 Access token: ${existingToken.substring(0, 20)}...`);
    console.log("✅ Authentication working correctly!");
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
    const credentials = await AuthAnthropic.exchange(code.trim(), verifier);

    await authStorage.set("anthropic", {
      type: "oauth",
      refresh: credentials.refresh,
      access: credentials.access,
      expires: credentials.expires,
    });

    console.log("✅ Authentication successful!");
    console.log("🔑 Credentials stored in " + authStorage.filepath);

    // Verify by getting access token
    const token = await getAccessToken();
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
