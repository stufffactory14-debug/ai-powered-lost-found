import { useState } from "react";
import AuthContext from "./authContext";
import { getStoredAuth, removeStoredAuth, saveStoredAuth } from "../utils/authStorage";

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(getStoredAuth);

  function signIn(token, user) {
    saveStoredAuth(token, user);
    setAuth({ token, user });
  }

  function logout() {
    removeStoredAuth();
    setAuth({ token: null, user: null });
  }

  const value = {
    token: auth.token,
    user: auth.user,
    isAuthenticated: Boolean(auth.token && auth.user),
    signIn,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

