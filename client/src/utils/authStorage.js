const AUTH_STORAGE_KEY = "lost-and-found-auth";

export function getStoredAuth() {
  try {
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!storedAuth) {
      return { token: null, user: null };
    }

    const { token, user } = JSON.parse(storedAuth);

    if (typeof token !== "string" || !user || typeof user !== "object") {
      removeStoredAuth();
      return { token: null, user: null };
    }

    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function saveStoredAuth(token, user) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
}

export function removeStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
