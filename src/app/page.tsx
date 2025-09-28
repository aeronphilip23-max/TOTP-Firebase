"use client";
import React from "react";
import { useRouter } from "next/navigation";
const HomePage = () => {
  const router = useRouter();

  return (
    <div>
      <button onClick={() => router.push("/auth/login")}>Go to Login</button>
      <button onClick={() => router.push("/auth/register")}>
        Go to Register
      </button>
    </div>
  );
};

export default HomePage;
