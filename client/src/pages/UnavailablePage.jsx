import { Link } from "react-router-dom";

function UnavailablePage({ title }) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center px-6 py-10">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Coming next</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-slate-600">This workspace is planned for a later phase. Your existing items and search tools remain available.</p>
        <Link className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white" to="/dashboard">Back to dashboard</Link>
      </section>
    </main>
  );
}

export default UnavailablePage;
