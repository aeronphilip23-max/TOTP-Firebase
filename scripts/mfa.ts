// scripts/enable-totp.ts
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const serviceAccount = {
  projectId: "logitrack-e1972",
  clientEmail:
    "firebase-adminsdk-fbsvc@logitrack-e1972.iam.gserviceaccount.com",
  privateKey:
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC2lXr3WUMS8KPO\n8VhDWFGOenQtuUqZjlcOWuaVvAbIAVK21ISUlJb0e5hfPbLyF6NWJVUjvRaQTokN\n2aFNqadu6X/g0YoD4cjxm0Z8+N+KHQjICqumodjSMuNNYettb5Fj8kBCREdBzWtR\n/EIj2b2jdiLQ1ATi8wHmIc+Y9WpiJTzlap4CIBK00G9sYFqzw+31RuzjjrD/qP/y\nvWmgjucYc2p8W03BQvHHX4gYkVEbrzHZSjoDB9QSYBZ3TaaECi9O5Q25XuQvRAMt\n3sXnP8MXwWGdEQC9Kj54EFbnqp5r3IANLJ4xA06qwNU6+v0NyjpNMbRW6mjdxorW\nrd60r1BRAgMBAAECggEACvoJnn07TxQwhOx1hfb1UD+EZItTNNAd47sLSc04CyYp\nNtyn69bTDHexvWgULgHFzBQKfk+L37kY/EAtNmIQstZO3dE7HuigEAZpwnGj3sXI\nFV6u2yG3y0tL5wcQBFBEyWFzA4jfT9FttkwYHdelUwJzLWLRuGMrpg46UNPQRX4l\nnqtFIFIuCdAZpjwet9sniDuFMGRRDFUVGwSnQueYoDUbvV0LRqE8NQKUhsniMg1H\nywwnQ/eQxD4YYs2i1R51eqZYVmm35l7tRDgXUh4hf3hK3Mdp+j5snWHDjt5h3chQ\nBWwbkEiZCy+C4ywCsc+RYihP+PPXFs5VDF/s7XlTwQKBgQDc9Ff9QUQaXrdnnCgi\nKkQmgqgTUGe5n6xLBcnEIpWPz4EuF/M7B4ZsYbPasgk7TwO9SHePAjPqSowgF5+E\nWtpanzN9yAMWgbQlftDIW09kk4hwjb1boauA6k3VSv6yN3W94sucrsCHF2AjpVG4\nlaIxAsbacnUdC9otIUrSIeYcvQKBgQDTiyJ+u7TU/ZflWuPzqmJzR8x/6mFZkwx3\nlUBtpINgp2/FMrcKbhKfgEJRkUIbyAaPUF8fbg+kZnCj7XQR3kCOLokVezsqdLhv\nBcXEvsjjvYsti+4a/lw/g/0uqczhzEzpTChIshJaLCl15L3wJNeFJnDzR8BndQwV\nR+gIUvbdJQKBgHBteDQqOH/+f+4dfCJeRU0fIGyrdgvynlWSPWcqfdWuLToJ/76i\nhpixYjW+b4oZG3r927AN2+K0SfauboGHRSHlberrkf6qwsJtc8jvBUfU9hDnXlm4\nuq6fCjmkrlJ6e9PCCf7QwLA8ibO5lAqLQPsVQZ+3q7W66SobjZm8m/01AoGAKapB\nxQxbdYftHvNj6l4ovePqV1dmjSn1TqhK5E1+ws63qPNwMdG0QU4VwdMGXkprYFbI\nJXycABldHixqrApGVLq9rUl0QcxzdwqABVw+XPy8KOBiqVZn/OqWN1aiT+bZTyn8\n1TSdgL0p/VpsPpxDBqqnnIMJVlcrZhWfkeQlUzECgYEAoQ69oOJrN7MbnT8a9L5j\n8BQ0qyIhyh7YJchQen7IfMVyDdtoP1S6kVyAUkFRfxsf//lFl5/8f/dLnJIaPEdi\nY5HXkYn5f8j0eQQOEZaVt10GFslZIgnSpNSVDj7BocYhMB531UpPRqZtPyi5Qnc5\nWo/r+vFxW9PYr7bl1DX/jyE=\n-----END PRIVATE KEY-----\n",
};

if (
  !serviceAccount.projectId ||
  !serviceAccount.clientEmail ||
  !serviceAccount.privateKey
) {
  console.error("❌ Missing Firebase credentials in environment variables.");
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
});

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
              adjacentIntervals: 2, // Allows codes from ±2 time windows (30s each)
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

enableTOTP();
