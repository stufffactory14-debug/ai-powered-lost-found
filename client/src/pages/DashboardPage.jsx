import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import useAuth from "../context/useAuth";
import api from "../lib/axios";

function DashboardPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/items", { params: { status: "ACTIVE" } }), api.get("/items", { params: { status: "RESOLVED" } })])
      .then(([activeResponse, resolvedResponse]) => {
        if (active) setItems([
          ...(Array.isArray(activeResponse?.data?.items) ? activeResponse.data.items : []),
          ...(Array.isArray(resolvedResponse?.data?.items) ? resolvedResponse.data.items : []),
        ]);
      })
      .catch(() => { if (active) setError("Live item statistics are temporarily unavailable."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const userId = user?._id || user?.id;
  const myItems = userId ? items.filter((item) => item.status === "ACTIVE" && (item.userId?._id || item.userId)?.toString() === userId.toString()) : [];
  const counts = {
    lost: items.filter((item) => item.type === "LOST").length,
    found: items.filter((item) => item.type === "FOUND").length,
    active: myItems.length,
    resolved: items.filter((item) => item.status === "RESOLVED").length,
  };
  const cards = [["Lost items", counts.lost], ["Found items", counts.found], ["My active posts", counts.active], ["Resolved items", counts.resolved]];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-indigo-600">Overview</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Welcome back, {user?.name || "there"}</h1><p className="mt-2 text-slate-600">Keep your community connected to the things that matter.</p></div></div>
      <section className="mt-8 grid gap-4 sm:grid-cols-3"><Link className="rounded-2xl bg-indigo-600 p-5 text-white shadow-sm transition hover:bg-indigo-700" to="/post-item?type=LOST"><p className="text-sm font-medium text-indigo-100">Report lost</p><p className="mt-2 text-lg font-semibold">Tell the community what you lost →</p></Link><Link className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm transition hover:bg-slate-800" to="/post-item?type=FOUND"><p className="text-sm font-medium text-slate-300">Report found</p><p className="mt-2 text-lg font-semibold">Help return an item →</p></Link><Link className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300" to="/find-match"><p className="text-sm font-medium text-indigo-600">Find a match</p><p className="mt-2 text-lg font-semibold text-slate-900">Search by photo →</p></Link></section>
      {error && <p className="mt-8 rounded-lg bg-amber-50 p-4 text-sm text-amber-800" role="status">{error}</p>}
      <section aria-label="Item summary" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{isLoading ? "—" : value}</p><p className="mt-1 text-xs text-slate-500">{isLoading ? "Loading live data" : "From active workspace data"}</p></div>)}</section>
    </main>
  );
}

export default DashboardPage;
