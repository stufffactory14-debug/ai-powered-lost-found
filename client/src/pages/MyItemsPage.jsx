import { useCallback, useEffect, useState } from "react";
import api from "../lib/axios";

function MyItemsPage() {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const loadItems = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/items/mine", { params: { ...(type ? { type } : {}), ...(status ? { status } : {}) } });
      setItems(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch (requestError) { setError(requestError.response?.data?.message || "Unable to load your items."); setItems([]); } finally { setLoading(false); }
  }, [type, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => { loadItems(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadItems, retry]);

  async function resolveItem(item) {
    if (!window.confirm(`Mark “${item.title || "this item"}” as resolved?`)) return;
    try { await api.patch(`/items/${item._id}/status`, { status: "RESOLVED" }); await loadItems(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to resolve this item."); }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete “${item.title || "this item"}”? This cannot be undone.`)) return;
    try { await api.delete(`/items/${item._id}`); await loadItems(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to delete this item."); }
  }

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div><p className="text-sm font-medium text-indigo-600">Your workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">My items</h1><p className="mt-2 text-slate-600">Manage the lost and found posts you created.</p></div><section className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"><label className="flex-1 text-sm font-medium text-slate-700">Type<select className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" onChange={(event) => setType(event.target.value)} value={type}><option value="">All types</option><option value="LOST">LOST</option><option value="FOUND">FOUND</option></select></label><label className="flex-1 text-sm font-medium text-slate-700">Status<select className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">ACTIVE</option><option value="RESOLVED">RESOLVED</option></select></label></section>{error && <div className="mt-8 rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">{error}<button className="ml-3 font-semibold underline" onClick={() => setRetry((value) => value + 1)} type="button">Retry</button></div>}{loading && <p className="mt-10 text-center text-slate-500" role="status">Loading your items...</p>}{!loading && !error && items.length === 0 && <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-600">No items match these filters.</p>}{!loading && !error && items.length > 0 && <section aria-label="My items" className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" key={item._id}>{item.imageUrl ? <img alt={item.title} className="h-48 w-full object-cover" src={item.imageUrl} /> : <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-400">No image available</div>}<div className="p-5"><div className="flex justify-between gap-3"><h2 className="text-lg font-semibold">{item.title}</h2><span className="text-xs font-semibold">{item.type}</span></div><div className="mt-3 space-y-1 text-sm text-slate-600"><p>{item.category}</p><p>{item.location}</p><p>{item.status}</p></div><div className="mt-5 flex gap-2">{item.status === "ACTIVE" && <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => resolveItem(item)} type="button">Mark as resolved</button>}<button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700" onClick={() => deleteItem(item)} type="button">Delete</button></div></div></article>)}</section>}</main>;
}

export default MyItemsPage;
