import { useEffect, useMemo, useState } from "react";
import { Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import JobAnalytics from "./pages/JobAnalytics";
import JobDetails from "./pages/JobDetails";
import PipelineHistory from "./pages/PipelineHistory";
import PromptTester from "./pages/PromptTester";

const THEME_STORAGE_KEY = "mcp-transform-ui-theme";

function App() {
  const [theme, setTheme] = useState(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useMemo(
    () => () => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark")),
    [],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_26%),linear-gradient(180deg,_#fffdf7_0%,_#f8fafc_55%,_#eef2ff_100%)] text-ink transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_48%,_#111827_100%)] dark:text-slate-100">
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<JobAnalytics />} />
          <Route path="/jobs/:jobId" element={<JobDetails />} />
          <Route path="/pipelines/:pipelineId" element={<PipelineHistory />} />
          <Route path="/prompt-tester" element={<PromptTester />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
