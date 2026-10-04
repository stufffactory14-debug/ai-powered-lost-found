import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import api from "../lib/axios";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from?.pathname || "/dashboard";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.post("/auth/login", { email, password });
      signIn(data.token, data.user);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to log in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <form className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-slate-900">Login</h1>
        <p className="mt-2 text-sm text-slate-600">Access your account.</p>
        {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="login-email">Email</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" id="login-email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="login-password">Password</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" id="login-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
        <button className="mt-6 w-full rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} type="submit">
          {isLoading ? "Logging in..." : "Login"}
        </button>
        <p className="mt-4 text-sm text-slate-600">Need an account? <Link className="font-medium text-slate-900" to="/signup">Sign up</Link></p>
      </form>
    </main>
  );
}

export default LoginPage;
