import { BrowserRouter, Link, Route, Routes, useNavigate } from "react-router-dom";
import useAuth from "./context/useAuth";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import PostItemPage from "./pages/PostItemPage";
import SignupPage from "./pages/SignupPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

function PlaceholderPage({ title, description }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center bg-slate-50 px-6 text-center text-slate-900">
      <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 text-slate-600">{description}</p>
    </main>
  );
}

function Navigation() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4">
      <nav className="mx-auto flex max-w-3xl items-center justify-between">
        <Link className="font-semibold text-slate-900" to="/">Lost &amp; Found</Link>
        <div className="flex gap-4 text-sm text-slate-600">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/post-item">Post item</Link>
              <button className="cursor-pointer" onClick={handleLogout} type="button">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<PlaceholderPage title="AI-Powered Lost & Found" description="Frontend foundation is running." />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/post-item" element={<ProtectedRoute><PostItemPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
