import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";

const navigation = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Browse items", to: "/browse" },
  { label: "Report lost item", to: "/post-item?type=LOST" },
  { label: "Report found item", to: "/post-item?type=FOUND" },
  { label: "Find match", to: "/find-match" },
  { label: "AI Search", to: "/search" },
  { label: "My items", to: "/my-items" },
  { label: "My claims", to: "/my-claims" },
  { label: "Claims received", to: "/claims-received" },
  { label: "Profile", to: "/profile" },
];

function linkIsActive(to, pathname) {
  return to.split("?")[0] === pathname;
}

function AppLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <button
        aria-label="Close navigation"
        className={`fixed inset-0 z-30 bg-slate-950/40 transition-opacity lg:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setIsOpen(false)}
        type="button"
      />
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#101a36] text-slate-200 shadow-xl transition-transform lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 font-bold text-white">L</div>
          <div className="ml-3">
            <p className="font-semibold tracking-tight text-white">Lost &amp; Found</p>
            <p className="text-xs text-slate-400">Community portal</p>
          </div>
        </div>
        <nav aria-label="Application navigation" className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          {navigation.map((item) => (
            <NavLink
              className={() => `block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${linkIsActive(item.to, location.pathname) ? "bg-indigo-500 text-white shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
              key={item.to}
              onClick={() => setIsOpen(false)}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-400 font-semibold text-white">{(user?.name || "U").charAt(0).toUpperCase()}</div>
            <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{user?.name || "Account"}</p><p className="truncate text-xs text-slate-400">{user?.email || "Signed in"}</p></div>
          </div>
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 hover:text-white" onClick={handleLogout} type="button">Sign out</button>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <button aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setIsOpen(true)} type="button">☰</button>
          <p className="ml-3 text-sm font-medium text-slate-500 lg:ml-0">Workspace</p>
        </header>
        <Outlet />
      </div>
    </div>
  );
}

export default AppLayout;
