import { useCallback, useEffect, useState } from "react";
import api from "../lib/axios";

const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

function MyClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [replyValues, setReplyValues] = useState({});
  const [replyingClaimId, setReplyingClaimId] = useState("");
  const [retry, setRetry] = useState(0);

  const loadClaims = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/claims/mine");
      setClaims(Array.isArray(response?.data?.claims) ? response.data.claims : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load your claims.");
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { loadClaims(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadClaims, retry]);

  async function submitReply(claim) {
    const reply = (replyValues[claim._id] || "").trim();
    if (!reply) {
      setError("Please enter a clarification reply.");
      return;
    }

    setReplyingClaimId(claim._id);
    setError("");
    setNotice("");
    try {
      await api.post(`/claims/${claim._id}/clarification-reply`, { reply });
      setNotice("Clarification reply submitted.");
      setReplyValues((current) => ({ ...current, [claim._id]: "" }));
      await loadClaims();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to submit clarification reply.");
    } finally {
      setReplyingClaimId("");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-medium text-indigo-600">Claimant workspace</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">My Claims</h1>
      <p className="mt-2 text-slate-600">Track your submitted claims and respond to owner questions.</p>
      {notice && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{notice}</div>}
      {error && <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert"><span>{error}</span><button className="font-semibold underline" onClick={() => setRetry((value) => value + 1)} type="button">Retry</button></div>}
      {loading && <p className="mt-10 text-center text-slate-500" role="status">Loading your claims...</p>}
      {!loading && !error && claims.length === 0 && <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold text-slate-900">No claims submitted</h2><p className="mt-2 text-sm text-slate-600">Claims you submit for found items will appear here.</p></div>}
      {!loading && !error && claims.length > 0 && <section aria-label="My claims" className="mt-8 grid gap-5 lg:grid-cols-2">{claims.map((claim) => { const item = claim.item; const canReply = claim.status === "PENDING" && claim.clarificationQuestion && !claim.clarificationReply; const isReplying = replyingClaimId === claim._id; return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" key={claim._id}><div className="flex gap-4 border-b border-slate-100 p-5">{item?.imageUrl ? <img alt={item.title || "Claimed item"} className="h-20 w-20 shrink-0 rounded-xl object-cover" src={item.imageUrl} /> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">No image</div>}<div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Claimed item</p><h2 className="mt-1 truncate text-lg font-semibold text-slate-900">{item?.title || "Item unavailable"}</h2><p className="mt-1 text-sm text-slate-500">{item ? `${item.type || "Item"} · ${item.location || "Location unavailable"}` : "Item unavailable"}</p></div><span className={`h-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STATUS_STYLES[claim.status] || "bg-slate-100 text-slate-700 ring-slate-500/20"}`}>{claim.status || "UNKNOWN"}</span></div><div className="p-5"><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</dt><dd className="mt-1">{item?.category || "Unavailable"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Item status</dt><dd className="mt-1">{item?.status || "Unavailable"}</dd></div></dl>{claim.clarificationQuestion && <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Owner&apos;s clarification question</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{claim.clarificationQuestion}</p>{claim.clarificationReply && <><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-indigo-700">Your reply</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{claim.clarificationReply}</p></>}</div>}{canReply && <form className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={(event) => { event.preventDefault(); submitReply(claim); }}><label className="block text-sm font-semibold text-slate-700" htmlFor={`reply-${claim._id}`}>Reply to the owner</label><textarea className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" disabled={Boolean(replyingClaimId)} id={`reply-${claim._id}`} maxLength={1000} onChange={(event) => setReplyValues((current) => ({ ...current, [claim._id]: event.target.value }))} placeholder="Provide the requested detail" required value={replyValues[claim._id] || ""} /><button className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={Boolean(replyingClaimId)} type="submit">{isReplying ? "Sending..." : "Submit Reply"}</button></form>}</div></article>; })}</section>}
    </main>
  );
}

export default MyClaimsPage;
