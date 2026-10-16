import { useRef, useState } from "react";
import api from "../lib/axios";

const SEARCH_LIMIT = 5;

function ItemCard({ item }) {
  const safeItem = item && typeof item === "object" ? item : {};
  const title = typeof safeItem.title === "string" ? safeItem.title : "Untitled item";
  const description = typeof safeItem.description === "string" ? safeItem.description : "No description provided.";
  const type = safeItem.type === "FOUND" ? "FOUND" : safeItem.type === "LOST" ? "LOST" : "";

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {typeof safeItem.imageUrl === "string" && safeItem.imageUrl.trim() && (
        <img alt={title} className="h-48 w-full object-cover" src={safeItem.imageUrl} />
      )}
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {type && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${type === "LOST" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
              {type}
            </span>
          )}
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          {typeof safeItem.category === "string" && <div><dt className="font-medium text-slate-800">Category</dt><dd>{safeItem.category}</dd></div>}
          {typeof safeItem.location === "string" && <div><dt className="font-medium text-slate-800">Location</dt><dd>{safeItem.location}</dd></div>}
          {typeof safeItem.status === "string" && <div><dt className="font-medium text-slate-800">Status</dt><dd>{safeItem.status}</dd></div>}
        </dl>
      </div>
    </article>
  );
}

function SearchPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const latestRequestRef = useRef(0);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery || isLoading) return;

    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    setError("");
    setItems([]);
    setHasSearched(true);
    setIsLoading(true);

    try {
      const response = await api.get("/items/search", {
        params: { q: trimmedQuery, limit: SEARCH_LIMIT },
      });
      const responseItems = response?.data?.items;
      if (!Array.isArray(responseItems)) {
        throw new Error("Unexpected search response");
      }
      if (requestId === latestRequestRef.current) {
        setItems(responseItems);
      }
    } catch (requestError) {
      if (requestId === latestRequestRef.current) {
        setItems([]);
        setError(requestError.response?.data?.message || "Search is unavailable right now. Please try again.");
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoading(false);
      }
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-indigo-600">Semantic search</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Search by description</h1>
        <p className="mt-2 text-slate-600">Describe what you are looking for in natural language.</p>
        <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="search-query">Search items</label>
          <input
            aria-describedby="search-help"
            className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2"
            id="search-query"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. black wallet lost near college"
            type="search"
            value={query}
          />
          <button className="rounded bg-slate-900 px-5 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading || !query.trim()} type="submit">
            {isLoading ? "Searching..." : "Search"}
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-500" id="search-help">Search up to five semantically related results.</p>
        {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      </section>

      {isLoading && <p className="mt-8 text-center text-slate-600" role="status">Searching items...</p>}
      {!isLoading && hasSearched && !error && items.length === 0 && (
        <p className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-600">No matching items found. Try a different description.</p>
      )}
      {!isLoading && items.length > 0 && (
        <section aria-label="Search results" className="mt-8 grid gap-5 md:grid-cols-2">
          {items.map((item, index) => (
            <ItemCard item={item} key={item?._id || `search-result-${index}`} />
          ))}
        </section>
      )}
    </main>
  );
}

export default SearchPage;
