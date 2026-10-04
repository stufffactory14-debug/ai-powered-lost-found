import { useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";

function DashboardPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
      <section className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-600">You are signed in.</p>
        <dl className="mt-6 space-y-2 text-slate-700">
          <div><dt className="inline font-medium">Name: </dt><dd className="inline">{user.name}</dd></div>
          <div><dt className="inline font-medium">Email: </dt><dd className="inline">{user.email}</dd></div>
          <div><dt className="inline font-medium">Phone: </dt><dd className="inline">{user.phone}</dd></div>
        </dl>
        <button className="mt-6 rounded bg-slate-900 px-4 py-2 font-medium text-white" onClick={handleLogout} type="button">Logout</button>
      </section>
    </main>
  );
}

export default DashboardPage;
