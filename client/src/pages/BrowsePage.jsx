import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/axios";

function BrowseImage({ item, title }) {
  const [failed, setFailed] = useState(false);
  if (!item?.imageUrl || failed) return <div aria-label="No image available" className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-400">No image available</div>;
  return <img alt={title} className="h-48 w-full object-cover" onError={() => setFailed(true)} src={item.imageUrl} />;
}

function BrowseCard({ item }) {
  const title = typeof item?.title === "string" && item.title.trim() ? item.title : "Untitled item";
  const type = item?.type === "LOST" || item?.type === "FOUND" ? item.type : null;
  const typeClass = type === "LOST" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><BrowseImage item={item} title={title} /><div className="p-5"><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">{title}</h2>{type ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeClass}`}>{type}</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">Type unavailable</span>}</div><p className="mt-2 line-clamp-2 text-sm text-slate-600">{typeof item?.description === "string" ? item.description : "No description provided."}</p><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500"><span>{item?.category || "Category unavailable"}</span><span>{item?.location || "Location unavailable"}</span><span>{item?.status || "Status unavailable"}</span></div>{item?._id && <Link className="mt-5 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-700" to={`/items/${item._id}`}>View details</Link>}</div></article>;
}

function BrowsePage() {
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    api.get("/items", { params: { ...(type ? { type } : {}), ...(category.trim() ? { category: category.trim() } : {}) } })
      .then((response) => { if (active) setItems(Array.isArray(response?.data?.items) ? response.data.items : []); })
      .catch(() => { if (active) { setItems([]); setError("Items are unavailable right now."); } })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [type, category, retryKey]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;
    return items.filter((item) => [item?.title, item?.description, item?.location].some((value) => typeof value === "string" && value.toLowerCase().includes(normalizedQuery)));
  }, [items, query]);
  const hasFilters = Boolean(type || category || query);

  function clearFilters() { setIsLoading(true); setError(""); setType(""); setCategory(""); setQuery(""); }

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div><p className="text-sm font-medium text-indigo-600">Marketplace</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Browse items</h1><p className="mt-2 text-slate-600">Explore active lost and found posts. Use filters or search the loaded items.</p></div><section aria-label="Browse filters" className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 md:grid-cols-3"><label className="text-sm font-medium text-slate-700 md:col-span-1">Search items<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" onChange={(event) => setQuery(event.target.value)} placeholder="Title, description, or location" type="search" value={query} /></label><label className="text-sm font-medium text-slate-700">Type<select className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" onChange={(event) => { setIsLoading(true); setType(event.target.value); }} value={type}><option value="">All items</option><option value="LOST">LOST</option><option value="FOUND">FOUND</option></select></label><label className="text-sm font-medium text-slate-700">Category<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" onChange={(event) => { setIsLoading(true); setCategory(event.target.value); }} placeholder="e.g. Electronics" value={category} /></label></div>{hasFilters && <button className="mt-4 text-sm font-semibold text-indigo-700 hover:text-indigo-900" onClick={clearFilters} type="button">Clear filters</button>}</section>{error && <div className="mt-8 rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert"><p>{error}</p><button className="mt-2 font-semibold underline" onClick={() => { setIsLoading(true); setRetryKey((key) => key + 1); }} type="button">Retry</button></div>}{isLoading && <p className="mt-10 text-center text-slate-500" role="status">Loading active items...</p>}{!isLoading && !error && visibleItems.length === 0 && <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-600">{hasFilters ? "No items match your search and filters." : "No active items are available yet."}</p>}{!isLoading && !error && visibleItems.length > 0 && <section aria-label="Browse items" className="mt-8 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">{visibleItems.map((item, index) => <BrowseCard item={item} key={item?._id || `browse-item-${index}`} />)}</section>}</main>;
}

export default BrowsePage;
