import { useCallback, useEffect, useState } from "react";
import api from "../lib/axios";

const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

function claimItemId(claim) {
  return typeof claim?.itemId === "object" ? claim.itemId?._id : claim?.itemId;
}

function ClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionClaimId, setActionClaimId] = useState("");
  const [clarificationClaimId, setClarificationClaimId] = useState("");
  const [clarificationQuestions, setClarificationQuestions] = useState({});
  const [retry, setRetry] = useState(0);

  const loadClaims = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/claims/received");
      const receivedClaims = Array.isArray(response?.data?.claims) ? response.data.claims : [];
      setClaims(receivedClaims);

      const itemIds = [...new Set(receivedClaims.map(claimItemId).filter(Boolean))];
      const itemResults = await Promise.all(itemIds.map(async (itemId) => {
        try {
          const itemResponse = await api.get(`/items/${itemId}`);
          return [itemId, itemResponse?.data?.item || null];
        } catch {
          return [itemId, null];
        }
      }));
      setItems(Object.fromEntries(itemResults));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load received claims.");
      setClaims([]);
      setItems({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { loadClaims(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadClaims, retry]);

  async function reviewClaim(claim, status) {
    const action = status === "ACCEPTED" ? "accept" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} this claim?`)) return;

    setActionClaimId(claim._id);
    setError("");
    setNotice("");
    try {
      await api.patch(`/claims/${claim._id}/review`, { status });
      setNotice(`Claim ${status === "ACCEPTED" ? "accepted" : "rejected"} successfully.`);
      await loadClaims();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to review this claim. It may already have been reviewed.");
    } finally {
      setActionClaimId("");
    }
  }

  async function requestClarification(claim) {
    const question = (clarificationQuestions[claim._id] || "").trim();
    if (!question) {
      setError("Please enter a clarification question.");
      return;
    }

    setClarificationClaimId(claim._id);
    setError("");
    setNotice("");
    try {
      await api.post(`/claims/${claim._id}/clarification-request`, { question });
      setNotice("Clarification request sent.");
      setClarificationQuestions((current) => ({ ...current, [claim._id]: "" }));
      await loadClaims();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to request clarification.");
    } finally {
      setClarificationClaimId("");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-medium text-indigo-600">Owner workspace</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Claims Management</h1>
        <p className="mt-2 text-slate-600">Review claims submitted for the items you reported.</p>
      </div>

      {notice && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{notice}</div>}
      {error && <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert"><span>{error}</span><button className="font-semibold underline" onClick={() => setRetry((value) => value + 1)} type="button">Retry</button></div>}
      {loading && <p className="mt-10 text-center text-slate-500" role="status">Loading received claims...</p>}
      {!loading && !error && claims.length === 0 && <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold text-slate-900">No claims to review</h2><p className="mt-2 text-sm text-slate-600">Claims submitted for your found items will appear here.</p></div>}

      {!loading && !error && claims.length > 0 && <section aria-label="Received claims" className="mt-8 grid gap-5 lg:grid-cols-2">
        {claims.map((claim) => {
          const itemId = claimItemId(claim);
          const item = items[itemId];
          const isPending = claim.status === "PENDING";
          const isBusy = actionClaimId === claim._id;
          const isRequestingClarification = clarificationClaimId === claim._id;
          const canReview = isPending && (!claim.clarificationQuestion || claim.clarificationReply);
          return (
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" key={claim._id}>
              <div className="flex gap-4 border-b border-slate-100 p-5">
                {item?.imageUrl ? <img alt={item.title || "Claimed item"} className="h-20 w-20 shrink-0 rounded-xl object-cover" src={item.imageUrl} /> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-center text-xs text-slate-400">No image</div>}
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Claim for</p><h2 className="mt-1 truncate text-lg font-semibold text-slate-900">{item?.title || "Item unavailable"}</h2><p className="mt-1 text-sm text-slate-500">{item ? `${item.type || "Item"} · ${item.location || "Location unavailable"}` : `Item ID: ${itemId || "Unavailable"}`}</p></div>
                <span className={`h-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STATUS_STYLES[claim.status] || "bg-slate-100 text-slate-700 ring-slate-500/20"}`}>{claim.status || "UNKNOWN"}</span>
              </div>
              <div className="p-5"><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</dt><dd className="mt-1 text-slate-800">{item?.category || "Unavailable"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Item status</dt><dd className="mt-1 text-slate-800">{item?.status || "Unavailable"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</dt><dd className="mt-1 text-slate-800">{claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : "Unavailable"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reviewed</dt><dd className="mt-1 text-slate-800">{claim.reviewedAt ? new Date(claim.reviewedAt).toLocaleDateString() : "Not reviewed"}</dd></div></dl><div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Claimant&apos;s verification answer</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{claim.verificationAnswer || "Answer unavailable"}</p></div>{claim.clarificationQuestion && <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Clarification question</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{claim.clarificationQuestion}</p>{claim.clarificationReply ? <><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-amber-700">Claimant&apos;s reply</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{claim.clarificationReply}</p></> : <p className="mt-3 text-sm text-amber-800">Waiting for the claimant&apos;s reply.</p>}</div>}{isPending && !claim.clarificationQuestion && <form className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={(event) => { event.preventDefault(); requestClarification(claim); }}><label className="block text-sm font-semibold text-slate-700" htmlFor={`clarification-${claim._id}`}>Request more information</label><textarea className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" disabled={Boolean(clarificationClaimId)} id={`clarification-${claim._id}`} maxLength={500} onChange={(event) => setClarificationQuestions((current) => ({ ...current, [claim._id]: event.target.value }))} placeholder="Ask the claimant for one specific detail" required value={clarificationQuestions[claim._id] || ""} /><button className="mt-3 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={Boolean(actionClaimId || clarificationClaimId)} type="submit">{isRequestingClarification ? "Sending..." : "Request More Information"}</button></form>}{canReview && <div className="mt-6 flex flex-wrap gap-3"><button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={Boolean(actionClaimId || clarificationClaimId)} onClick={() => reviewClaim(claim, "ACCEPTED")} type="button">{isBusy ? "Updating..." : "Accept claim"}</button><button className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={Boolean(actionClaimId || clarificationClaimId)} onClick={() => reviewClaim(claim, "REJECTED")} type="button">Reject claim</button></div>}</div>
            </article>
          );
        })}
      </section>}
    </main>
  );
}

export default ClaimsPage;
