"use client";
import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  getAuth,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTM5_DoF5CdbVqOCpnd7_ps1e9wSahTMY",
  authDomain: "logitrack-e1972.firebaseapp.com",
  projectId: "logitrack-e1972",
  storageBucket: "logitrack-e1972.firebasestorage.app",
  messagingSenderId: "29625075825",
  appId: "1:29625075825:web:0fcbaa6ff2bb1d9fe433d0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const VerifyOTP = () => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const navigate = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        navigate.push("auth/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Function to initiate TOTP MFA enrollment
  const enrollTotpMfa = async () => {
    if (!user) {
      setError("No user is signed in.");
      return;
    }

    try {
      const multiFactorSession = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(
        multiFactorSession
      );
      const totpInfo = await multiFactor(user).enrolledFactors;
      if (totpInfo.length > 0) {
        setError("TOTP MFA is already enrolled.");
        return;
      }

      const totpUri = secret.generateQrCodeUrl(
        user.email || "",
        "LogiTrack OTP"
      );

      // Generate TOTP secret and store it in state
      setTotpSecret(secret);
      setTotpUri(totpUri);
      setError("Scan the QR code with your authenticator app.");
    } catch (err) {
      setError("Error initiating TOTP MFA: " + (err as Error).message);
    }
  };

  // Function to verify TOTP code and complete enrollment
  const verifyTotpCode = async () => {
    if (!user || !totpSecret || !totpCode) {
      setError("Please provide a valid TOTP code.");
      return;
    }

    try {
      await multiFactor(user).enroll(
        TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, totpCode),
        "TOTP Authenticator"
      );
      setError("TOTP MFA enrolled successfully!");
      setTotpSecret(null); // Clear QR code after enrollment
      setTotpCode(""); // Clear input
    } catch (err) {
      setError("Error enrolling TOTP MFA: " + (err as Error).message);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h2>Verify OTP</h2>
      {user ? (
        <>
          <p>Welcome, {user.email || "User"}!</p>
          <button onClick={enrollTotpMfa} disabled={totpSecret !== null}>
            Enable TOTP MFA
          </button>
          {totpSecret && (
            <div className="space-y-56">
              {/* <QRCodeSVG value={totpSecret.secretKey} size={200} /> */}
              <div className="my-7">
                <QRCodeSVG value={totpUri} size={200} />
              </div>
              <p>Scan the QR code with your authenticator app.</p>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="Enter TOTP code"
                style={{ width: "100%", margin: "10px 0" }}
              />
              <button onClick={verifyTotpCode}>Verify TOTP Code</button>
            </div>
          )}
          <button onClick={() => auth.signOut()}>Sign Out</button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default VerifyOTP;
