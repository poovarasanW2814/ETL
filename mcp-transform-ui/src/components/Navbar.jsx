import { Link, NavLink } from "react-router-dom";

function Navbar({ theme, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/75 backdrop-blur transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/75">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-sm font-extrabold uppercase tracking-[0.2em] text-white dark:bg-amber-500 dark:text-slate-950">
            MCP
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">
              ETL Monitoring
            </p>
            <h1 className="text-lg font-extrabold text-ink dark:text-slate-100 sm:text-xl">
              MCP Data Transform Service
            </h1>
          </div>
        </Link>

        <nav className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/80">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-ink text-white dark:bg-amber-500 dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/prompt-tester"
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-ink text-white dark:bg-amber-500 dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`
            }
          >
            Prompt Tester
          </NavLink>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-ink text-white dark:bg-amber-500 dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`
            }
          >
            Analytics
          </NavLink>
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
