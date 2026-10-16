import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/axios";

function ItemDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.get(`/items/${id}`).then((response) => setItem(response?.data?.item || null)).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load item.")); }, [id]);
  if (error) return <main className="mx-auto max-w-3xl px-6 py-12"><p className="rounded-lg bg-red-50 p-4 text-red-700" role="alert">{error}</p><Link className="mt-4 inline-block text-indigo-700" to="/browse">Back to browse</Link></main>;
  if (!item) return <main className="mx-auto max-w-3xl px-6 py-12 text-slate-500" role="status">Loading item...</main>;
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8"><Link className="text-sm font-medium text-indigo-700" to="/browse">← Back to browse</Link><article className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{item.imageUrl && <img alt={item.title} className="max-h-[28rem] w-full object-cover" src={item.imageUrl} />}<div className="p-6"><div className="flex justify-between gap-4"><h1 className="text-3xl font-bold text-slate-900">{item.title}</h1><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{item.type}</span></div><p className="mt-4 leading-7 text-slate-600">{item.description}</p><dl className="mt-6 grid gap-4 sm:grid-cols-3"><div><dt className="text-xs font-semibold uppercase text-slate-500">Category</dt><dd className="mt-1">{item.category}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-500">Location</dt><dd className="mt-1">{item.location}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-500">Status</dt><dd className="mt-1">{item.status}</dd></div></dl></div></article></main>;
}

export default ItemDetailsPage;
