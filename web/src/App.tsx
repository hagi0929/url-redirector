import { Link2, BookOpen, BarChart3, Link as LinkIcon } from "lucide-react";
import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { LinksPage } from "./pages/LinksPage";
import { StatsPage } from "./pages/StatsPage";

export function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-panel/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="size-9 rounded-lg bg-gradient-to-br from-accent to-accent2 inline-flex items-center justify-center shadow-card">
              <Link2 size={18} className="text-white" />
            </span>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">URL Redirector</h1>
              <p className="text-[11px] text-muted">Short links · live metrics</p>
            </div>
          </Link>
          <nav className="ml-2 inline-flex items-center gap-0.5 bg-panel2 border border-border rounded-md p-0.5">
            <TabLink to="/" icon={LinkIcon} label="Links" />
            <TabLink to="/stats" icon={BarChart3} label="Stats" />
          </nav>
          <div className="flex-1" />
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted hover:text-text hover:bg-panel2"
          >
            <BookOpen size={14} />
            API
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <Routes>
          <Route path="/" element={<LinksPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function TabLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Link2;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
          isActive ? "bg-bg text-text" : "text-muted hover:text-text"
        }`
      }
    >
      <Icon size={13} />
      {label}
    </NavLink>
  );
}
