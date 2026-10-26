import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/axios";

const SEARCH_LIMIT = 5;
const SUGGESTIONS = ["Black wallet near library", "Blue backpack", "Silver water bottle"];

function SearchIcon() {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24"><path d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function ResultImage({ item, title }) {
  const [failed, setFailed] = useState(false);
  if (!item?.imageUrl || failed) return <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-400">No image available</div>;
  return <img alt={title} className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.02]" onError={() => setFailed(true)} src={item.imageUrl} />;
}

function ItemCard({ item }) {
  const safeItem = item && typeof item === "object" ? item : {};
  const title = typeof safeItem.title === "string" && safeItem.title.trim() ? safeItem.title : "Untitled item";
  const description = typeof safeItem.description === "string" && safeItem.description.trim() ? safeItem.description : "No description provided.";
  const type = safeItem.type === "FOUND" || safeItem.type === "LOST" ? safeItem.type : null;
  return <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg"><ResultImage item={safeItem} title={title} /><div className="p-5"><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">{title}</h2>{type && <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${type === "LOST" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{type}</span>}</div><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{description}</p><dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm"><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Category</dt><dd className="mt-1 text-slate-700">{safeItem.category || "Unavailable"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Location</dt><dd className="mt-1 text-slate-700">{safeItem.location || "Unavailable"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt><dd className="mt-1 text-slate-700">{safeItem.status || "Unavailable"}</dd></div></dl>{safeItem._id && <Link className="mt-5 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-900" to={`/items/${safeItem._id}`}>View item details <span aria-hidden="true" className="ml-1">→</span></Link>}</div></article>;
}

function SearchPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const latestRequestRef = useRef(0);

  async function runSearch(rawQuery) {
    const trimmedQuery = rawQuery.trim();
    if (!trimmedQuery || isLoading) return;
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    setQuery(trimmedQuery);
    setError("");
    setItems([]);
    setHasSearched(true);
    setIsLoading(true);
    try {
      const response = await api.get("/items/search", { params: { q: trimmedQuery, limit: SEARCH_LIMIT } });
      const responseItems = response?.data?.items;
      if (!Array.isArray(responseItems)) throw new Error("Unexpected search response");
      if (requestId === latestRequestRef.current) setItems(responseItems);
    } catch (requestError) {
      if (requestId === latestRequestRef.current) {
        setItems([]);
        setError(requestError.response?.data?.message || "Search is unavailable right now. Please try again.");
      }
    } finally {
      if (requestId === latestRequestRef.current) setIsLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    runSearch(query);
  }

  return <main className="min-h-screen bg-[#f6f8fc] px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#101a36] via-[#172554] to-indigo-900 px-6 py-10 text-white shadow-xl shadow-slate-300/40 sm:px-10 sm:py-14"><div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" /><div className="pointer-events-none absolute bottom-0 right-1/4 h-24 w-64 rounded-full bg-sky-300/10 blur-3xl" /><div className="relative max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100"><span className="h-1.5 w-1.5 rounded-full bg-indigo-300 shadow-[0_0_10px_rgba(165,180,252,0.9)]" />AI-powered search</span><h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">Find the right report with a description.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Describe what was lost or found in your own words. Semantic search looks beyond exact keywords to surface related community reports.</p><form className="mt-8" onSubmit={handleSubmit}><label className="sr-only" htmlFor="search-query">Describe an item to search</label><div className="flex flex-col gap-3 rounded-2xl border border-white/50 bg-white p-2 shadow-2xl sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3 px-3 text-slate-400"><SearchIcon /><input aria-describedby="search-help" className="min-w-0 flex-1 border-0 bg-transparent py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0" id="search-query" onChange={(event) => setQuery(event.target.value)} placeholder="e.g. black wallet lost near college" type="search" value={query} /></div><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isLoading || !query.trim()} type="submit">{isLoading ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Searching...</> : <><SearchIcon />Search reports</>}</button></div></form><p className="mt-3 text-xs text-slate-400" id="search-help">Search up to five semantically related results.</p></div></section><section className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm sm:flex sm:items-center sm:gap-4"><p className="shrink-0 text-sm font-semibold text-slate-700">Try an example</p><div className="mt-3 flex flex-wrap gap-2 sm:mt-0">{SUGGESTIONS.map((suggestion) => <button className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} key={suggestion} onClick={() => runSearch(suggestion)} type="button">{suggestion}</button>)}</div></section>{error && <section className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800" role="alert"><div className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 font-bold">!</span><div><h2 className="font-semibold">Search could not be completed</h2><p className="mt-1 text-sm">{error}</p><button className="mt-3 text-sm font-semibold underline" onClick={() => runSearch(query)} type="button">Try again</button></div></div></section>}{isLoading && <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-14 text-slate-500 shadow-sm" role="status"><span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" /><p className="mt-3 text-sm font-medium">Finding semantically related reports...</p></div>}{!isLoading && hasSearched && !error && items.length === 0 && <section className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><SearchIcon /></div><h2 className="mt-4 text-xl font-semibold text-slate-900">No similar reports found</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Try adding a color, location, item type, or another identifying detail to your description.</p></section>}{!isLoading && items.length > 0 && <section className="mt-10" aria-label="Semantic search results"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-indigo-600">Semantic results</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Possible matches</h2></div><p className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">{items.length} {items.length === 1 ? "result" : "results"}</p></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((item, index) => <ItemCard item={item} key={item?._id || `search-result-${index}`} />)}</div></section>}</div></main>;
}

export default SearchPage;
