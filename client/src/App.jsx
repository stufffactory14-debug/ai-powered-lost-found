import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

function PlaceholderPage({ title, description }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center bg-slate-50 px-6 text-center text-slate-900">
      <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 text-slate-600">{description}</p>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <nav className="mx-auto flex max-w-3xl items-center justify-between">
          <Link className="font-semibold text-slate-900" to="/">Lost &amp; Found</Link>
          <div className="flex gap-4 text-sm text-slate-600">
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign up</Link>
          </div>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<PlaceholderPage title="AI-Powered Lost & Found" description="Frontend foundation is running." />} />
        <Route path="/login" element={<PlaceholderPage title="Login" description="Login will be implemented in a later step." />} />
        <Route path="/signup" element={<PlaceholderPage title="Sign up" description="Sign-up will be implemented in a later step." />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
