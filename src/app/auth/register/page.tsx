"use client";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";

type RegisterProps = {
  email: string;
  password: string;
  name: string;
};

const Register = () => {
  const navigate = useRouter();
  const [user, setUser] = useState<RegisterProps>({
    name: "",
    password: "",
    email: "",
  });
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isEmailSent, setIsEmailSent] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Listen for auth state changes to check verification status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { email, name, password } = user;

      if (!name || !email || !password) {
        setError("Please fill in all fields.");
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError("Password should be at least 6 characters long.");
        setLoading(false);
        return;
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const newUser = userCredential.user;

      // Update the user's name
      await updateProfile(newUser, {
        displayName: name,
      });

      // Send email verification
      await sendEmailVerification(newUser);
      setIsEmailSent(true);
      setSuccess(
        "Account created! A verification email has been sent to your email address. Please verify your email before logging in."
      );

      // Store user data in Firestore
      await setDoc(doc(db, "users", newUser.uid), {
        name: name,
        email: email,
        emailVerified: false,
        createdAt: new Date(),
        uid: newUser.uid,
      });
    } catch (error) {
      const errorCode = (error as any).code;
      const errorMessage = (error as Error).message;
      switch (errorCode) {
        case "auth/email-already-in-use":
          setError(
            "This email is already registered. Please use a different email."
          );
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/weak-password":
          setError("Password should be at least 6 characters long.");
          break;
        default:
          setError(`Error creating account: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!currentUser) {
      setError("No user found. Please try registering again.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await sendEmailVerification(currentUser);
      setSuccess(
        "Verification email sent successfully! Please check your inbox."
      );
    } catch (error) {
      setError("Error sending verification email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!currentUser) {
      setError("No user found. Please try registering again.");
      return;
    }

    try {
      setLoading(true);
      // Reload user to get latest verification status
      await currentUser.reload();
      const updatedUser = auth.currentUser;

      if (updatedUser?.emailVerified) {
        setSuccess("Email verified successfully! Redirecting to login...");
        setTimeout(() => {
          navigate.push("/login");
        }, 2000);
      } else {
        setError(
          "Email not verified yet. Please check your inbox and verify your email."
        );
      }
    } catch (error) {
      setError("Error checking verification status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualLoginRedirect = () => {
    if (currentUser?.emailVerified) {
      navigate.push("/login");
    } else {
      setError(
        "Please verify your email before logging in. Check your inbox for the verification link."
      );
    }
  };

  return (
    <div className="flex flex-col place-items-center min-h-screen bg-gray-100 p-4 text-black">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col justify-center gap-4 p-6 bg-white rounded-lg shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-center text-black">Register</h2>

        {!isEmailSent ? (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                value={user.name}
                onChange={handleInputChange}
                type="text"
                placeholder="Full Name"
                className="p-2 border rounded-md"
                disabled={loading}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                value={user.email}
                onChange={handleInputChange}
                type="email"
                placeholder="nivekamures@gmail.com"
                className="p-2 border rounded-md"
                disabled={loading}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                value={user.password}
                onChange={handleInputChange}
                type="password"
                placeholder="Password (min. 6 characters)"
                className="p-2 border rounded-md"
                disabled={loading}
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className={`p-2 rounded-md text-white ${
                loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h3 className="font-semibold text-yellow-800">
                Email Verification Required
              </h3>
              <p className="text-yellow-700 text-sm mt-2">
                Please check your email inbox and click the verification link to
                activate your account.
              </p>
            </div>

            {success && <p className="text-green-500 text-sm">{success}</p>}
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex flex-col gap-3 text-white">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={loading}
                className="p-2 bg-blue-500  rounded-md hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loading ? "Sending..." : "Resend Verification Email"}
              </button>

              <button
                type="button"
                onClick={handleCheckVerification}
                disabled={loading}
                className="p-2 bg-green-500 rounded-md hover:bg-green-600 disabled:bg-gray-400"
              >
                {loading ? "Checking..." : "I've Verified My Email"}
              </button>

              <button
                type="button"
                onClick={handleManualLoginRedirect}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Go to Login
              </button>
            </div>

            <div className="text-xs text-gray-black mt-4">
              <p>
                <strong>Note:</strong> You must verify your email before you can
                log in.
              </p>
              <p>Check your spam folder if you don't see the email.</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default Register;
