import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import api from "../lib/axios";

function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      setError("Name, email, phone, and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.post("/auth/signup", form);
      signIn(data.token, data.user);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <form className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-slate-900">Sign up</h1>
        <p className="mt-2 text-sm text-slate-600">Create your account.</p>
        {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="signup-name">Name</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" id="signup-name" name="name" onChange={updateField} value={form.name} />
        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="signup-email">Email</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" id="signup-email" name="email" onChange={updateField} type="email" value={form.email} />
        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="signup-phone">Phone</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" id="signup-phone" name="phone" onChange={updateField} type="tel" value={form.phone} />
        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="signup-password">Password</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" id="signup-password" name="password" onChange={updateField} type="password" value={form.password} />
        <button className="mt-6 w-full rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} type="submit">
          {isLoading ? "Creating account..." : "Sign up"}
        </button>
        <p className="mt-4 text-sm text-slate-600">Already have an account? <Link className="font-medium text-slate-900" to="/login">Login</Link></p>
      </form>
    </main>
  );
}

export default SignupPage;
