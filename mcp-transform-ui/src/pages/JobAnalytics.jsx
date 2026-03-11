import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getJobAnalytics } from "../api/mcpApi";
import JobTable from "../components/JobTable";
import Loader from "../components/Loader";

const DURATION_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Last 24h", value: "24h" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Custom", value: "custom" },
];

const STATUS_COLORS = {
  SUCCESS: "#10b981",
  FAILED: "#f43f5e",
  STARTED: "#f59e0b",
  PENDING: "#94a3b8",
  RECEIVED: "#38bdf8",
  RETRY: "#0ea5e9",
};

function formatDateInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function JobAnalytics() {
  const [duration, setDuration] = useState("7d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const params = { page, limit };
        if (duration === "custom") {
          if (startDate) {
            params.start_date = new Date(`${startDate}T00:00:00`).toISOString();
          }
          if (endDate) {
            params.end_date = new Date(`${endDate}T23:59:59`).toISOString();
          }
        } else {
          params.duration = duration;
        }

        const data = await getJobAnalytics(params);
        if (!mounted) {
          return;
        }

        setAnalytics(data);
        setError("");
      } catch (fetchError) {
        if (!mounted) {
          return;
        }

        setError(
          fetchError.response?.data?.detail ?? "Unable to load job analytics.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [duration, endDate, limit, page, startDate]);

  const totalPages = analytics ? Math.max(Math.ceil(analytics.total / limit), 1) : 1;

  return (
    <section className="space-y-6">
      <div className="glass-panel px-6 py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">
          Job analytics
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100">
              Runtime analytics dashboard
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Explore MCP job execution trends across selected time windows with status,
              duration, and volume breakdowns.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-ink px-4 py-3 text-white dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300 dark:text-slate-400">
                Jobs
              </p>
              <p className="mt-1 text-2xl font-extrabold">
                {analytics?.summary.total_jobs ?? 0}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-700">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Success
              </p>
              <p className="mt-1 text-2xl font-extrabold text-ink dark:text-slate-100">
                {analytics?.summary.success_count ?? 0}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-700">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Failed
              </p>
              <p className="mt-1 text-2xl font-extrabold text-ink dark:text-slate-100">
                {analytics?.summary.failed_count ?? 0}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-700">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Running
              </p>
              <p className="mt-1 text-2xl font-extrabold text-ink dark:text-slate-100">
                {analytics?.summary.running_count ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-3">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setDuration(option.value);
                  setPage(1);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  duration === option.value
                    ? "bg-ink text-white dark:bg-amber-500 dark:text-slate-950"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {duration === "custom" ? (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </>
            ) : null}
            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? <Loader label="Fetching analytics..." /> : null}

      {!loading && error ? (
        <div className="glass-panel border-rose-200 px-6 py-8 text-rose-700 dark:border-rose-900/70 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {!loading && !error && analytics ? (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="glass-panel px-6 py-6">
              <h3 className="text-lg font-extrabold text-ink dark:text-slate-100">
                Status distribution
              </h3>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.status_breakdown}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                    >
                      {analytics.status_breakdown.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] ?? "#64748b"}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel px-6 py-6">
              <h3 className="text-lg font-extrabold text-ink dark:text-slate-100">
                Average duration by pipeline
              </h3>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.duration_breakdown.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.18} />
                    <XAxis dataKey="pipeline_id" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="average_duration" fill="#f59e0b" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="glass-panel px-6 py-6">
            <h3 className="text-lg font-extrabold text-ink dark:text-slate-100">
              Job volume over time
            </h3>
            <div className="mt-6 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.18} />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="job_count" fill="#0f172a" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <JobTable jobs={analytics.jobs} />

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((currentPage) => Math.min(currentPage + 1, totalPages))}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default JobAnalytics;
