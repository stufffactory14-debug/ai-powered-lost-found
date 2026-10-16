import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import api from "../lib/axios";
import AuthShell from "../components/AuthShell";

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

  return <AuthShell mode="signup"><form className="mt-8" onSubmit={handleSubmit}>
        {error && <p className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {[["name", "Name", "text"], ["email", "Email", "email"], ["phone", "Phone", "tel"], ["password", "Password", "password"]].map(([name, label, type]) => <div className="mb-5" key={name}><label className="block text-sm font-medium text-slate-700" htmlFor={`signup-${name}`}>{label}</label><input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" id={`signup-${name}`} name={name} onChange={updateField} type={type} value={form[name]} /></div>)}
        <button className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} type="submit">
          {isLoading ? "Creating account..." : "Sign up"}
        </button>
        <p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link className="font-semibold text-indigo-700" to="/login">Login</Link></p>
      </form></AuthShell>;
}

export default SignupPage;
