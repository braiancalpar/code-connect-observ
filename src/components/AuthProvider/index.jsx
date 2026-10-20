"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

export const AuthProvider = ({ children }) => {
  useEffect(() => {
    console.log("AuthProvider montado!");
  }, []);
  return <SessionProvider>{children}</SessionProvider>;
};
