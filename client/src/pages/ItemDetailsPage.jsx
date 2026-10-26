import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/axios";
import useAuth from "../context/useAuth";

function idValue(value) {
  return typeof value === "object" ? value?._id || value?.id : value;
}

function ItemDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/items/${id}`)
      .then((response) => {
        if (active) setItem(response?.data?.item || null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load item.");
      });
    return () => { active = false; };
  }, [id]);

  async function submitClaim(event) {
    event.preventDefault();
    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) {
      setClaimError("Please enter a verification answer.");
      return;
    }

    setSubmittingClaim(true);
    setClaimError("");
    setClaimSuccess("");
    try {
      await api.post("/claims", { itemId: id, verificationAnswer: trimmedAnswer });
      setClaimSuccess("Your claim was submitted and is pending review.");
      setClaimSubmitted(true);
      setAnswer("");
    } catch (requestError) {
      setClaimError(requestError.response?.data?.message || "Unable to submit your claim. Please try again.");
    } finally {
      setSubmittingClaim(false);
    }
  }

  if (error) return <main className="mx-auto max-w-3xl px-6 py-12"><p className="rounded-lg bg-red-50 p-4 text-red-700" role="alert">{error}</p><Link className="mt-4 inline-block text-indigo-700" to="/browse">Back to browse</Link></main>;
  if (!item) return <main className="mx-auto max-w-3xl px-6 py-12 text-slate-500" role="status">Loading item...</main>;

  const ownerId = idValue(item.userId);
  const currentUserId = idValue(user);
  const isOwner = ownerId && currentUserId && String(ownerId) === String(currentUserId);
  const canClaim = Boolean(user) && item.type === "FOUND" && item.status === "ACTIVE" && !isOwner;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link className="text-sm font-medium text-indigo-700" to="/browse">← Back to browse</Link>
      <article className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {item.imageUrl && <img alt={item.title} className="max-h-[28rem] w-full object-cover" src={item.imageUrl} />}
        <div className="p-6">
          <div className="flex justify-between gap-4"><h1 className="text-3xl font-bold text-slate-900">{item.title}</h1><span className="h-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{item.type}</span></div>
          <p className="mt-4 leading-7 text-slate-600">{item.description}</p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3"><div><dt className="text-xs font-semibold uppercase text-slate-500">Category</dt><dd className="mt-1">{item.category}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-500">Location</dt><dd className="mt-1">{item.location}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-500">Status</dt><dd className="mt-1">{item.status}</dd></div></dl>
        </div>
      </article>

      {canClaim && !claimSubmitted && <section className="mt-6 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm" aria-labelledby="claim-heading">
        <h2 className="text-xl font-semibold text-slate-900" id="claim-heading">Submit a Claim</h2>
        <p className="mt-2 text-sm text-slate-600">Answer the owner’s verification question to help them review your claim.</p>
        <form className="mt-5" onSubmit={submitClaim}>
          <label className="block text-sm font-medium text-slate-700" htmlFor="verification-answer">Verification answer</label>
          <textarea className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" disabled={submittingClaim} id="verification-answer" maxLength={500} onChange={(event) => setAnswer(event.target.value)} placeholder="Enter your answer" required value={answer} />
          {claimError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{claimError}</p>}
          <button className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={submittingClaim} type="submit">{submittingClaim ? "Submitting..." : "Submit Claim"}</button>
        </form>
      </section>}

      {claimSubmitted && <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800" role="status"><h2 className="font-semibold">Claim submitted</h2><p className="mt-1 text-sm">{claimSuccess}</p></section>}
      {!canClaim && !claimSubmitted && item.type === "FOUND" && item.status !== "ACTIVE" && <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">Claims are closed because this item is no longer active.</p>}
      {!canClaim && !claimSubmitted && item.type === "FOUND" && item.status === "ACTIVE" && isOwner && <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">You cannot claim your own item.</p>}
    </main>
  );
}

export default ItemDetailsPage;
