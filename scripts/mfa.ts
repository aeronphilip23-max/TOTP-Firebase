// scripts/enable-totp.ts
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get Firebase Admin credentials from environment variables
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newlines in env var
};

// Validate that all required environment variables are present
if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error("❌ Missing Firebase Admin credentials in environment variables.");
  console.error("Please ensure these are set in your .env.local file:");
  console.error("  - FIREBASE_PROJECT_ID");
  console.error("  - FIREBASE_CLIENT_EMAIL"); 
  console.error("  - FIREBASE_PRIVATE_KEY");
  process.exit(1);
}

// Validate private key format
if (!serviceAccount.privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
  console.error("❌ Invalid FIREBASE_PRIVATE_KEY format.");
  console.error("Make sure it includes the BEGIN/END PRIVATE KEY headers and proper newlines.");
  process.exit(1);
}

try {
  initializeApp({
    credential: cert(serviceAccount as any),
  });
  console.log("✅ Firebase Admin initialized successfully");
} catch (error: any) {
  console.error("❌ Error initializing Firebase Admin:");
  console.error("  Message:", error.message);
  process.exit(1);
}

async function enableTOTP() {
  try {
    const auth = getAuth();
    await auth.projectConfigManager().updateProjectConfig({
      multiFactorConfig: {
        state: "ENABLED",
        providerConfigs: [
          {
            state: "ENABLED",
            totpProviderConfig: {
              adjacentIntervals: 2, 
            },
          },
        ],
      },
    });
    console.log(
      "✅ TOTP MFA enabled successfully for project:",
      serviceAccount.projectId
    );
  } catch (error: any) {
    console.error("❌ Error enabling TOTP MFA:");
    console.error("  Code:", error.code);
    console.error("  Message:", error.message);
    if (error.code === "auth/insufficient-permission") {
      console.error(
        "  Ensure the service account has 'firebaseauth.configs.update' permission."
      );
    }
    process.exit(1);
  }
}

// Run the function
enableTOTP();