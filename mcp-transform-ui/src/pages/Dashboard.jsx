import { useCallback, useEffect, useRef, useState } from "react";

import { getJobEventsWebSocketUrl, getJobs } from "../api/mcpApi";
import JobTable from "../components/JobTable";
import Loader from "../components/Loader";

const FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Success", value: "SUCCESS" },
  { label: "Failure", value: "FAILED" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const refreshTimeoutRef = useRef(null);

  const loadJobs = useCallback(async () => {
    try {
      const data = await getJobs({
        status: activeFilter || undefined,
        search: search || undefined,
        page,
        limit,
      });

      setJobs(data.jobs ?? []);
      setTotal(data.total ?? 0);
      setError("");
    } catch (fetchError) {
      setError(
        fetchError.response?.data?.detail ??
          "Unable to load MCP jobs. Ensure the backend exposes /api/v1/mcp-jobs.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeFilter, limit, page, search]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    let socket;
    let reconnectTimeoutId;
    let isUnmounted = false;

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        return;
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null;
        loadJobs();
      }, 400);
    };

    const connect = () => {
      socket = new WebSocket(getJobEventsWebSocketUrl());

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);

        if (payload.event_type === "job_log") {
          return;
        }

        scheduleRefresh();
      };

      socket.onclose = () => {
        if (isUnmounted) {
          return;
        }

        reconnectTimeoutId = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      if (reconnectTimeoutId) {
        window.clearTimeout(reconnectTimeoutId);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [loadJobs]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <section className="space-y-6">
      <div className="glass-panel px-6 py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">
          Live Queue Overview
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100">
              Transformation job dashboard
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Monitor ETL-triggered MCP jobs, review status changes, and inspect processing
              throughput from the live backend.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-ink px-4 py-3 text-white dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300 dark:text-slate-400">Jobs</p>
              <p className="mt-1 text-2xl font-extrabold">{jobs.length}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-700">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Refresh</p>
              <p className="mt-1 text-2xl font-extrabold text-ink dark:text-slate-100">10s</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-700">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Source</p>
              <p className="mt-1 text-2xl font-extrabold text-ink dark:text-slate-100">Live</p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => {
                setActiveFilter(filter.value);
                setPage(1);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeFilter === filter.value
                  ? "bg-ink text-white dark:bg-amber-500 dark:text-slate-950"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search job ID, pipeline ID, or batch ID"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 sm:max-w-md"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>Rows per page</span>
              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Showing page {page} of {totalPages}
            </div>
          </div>
        </div>
      </div>

      {loading ? <Loader label="Fetching MCP jobs..." /> : null}

      {!loading && error ? (
        <div className="glass-panel border-rose-200 px-6 py-8 text-rose-700 dark:border-rose-900/70 dark:text-rose-300">{error}</div>
      ) : null}

      {!loading && !error && jobs.length === 0 ? (
        <div className="glass-panel px-6 py-10 text-center text-slate-500 dark:text-slate-400">
          No MCP jobs available yet.
        </div>
      ) : null}

      {!loading && !error && jobs.length > 0 ? <JobTable jobs={jobs} /> : null}

      {!loading && !error && totalPages > 1 ? (
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
    </section>
  );
}

export default Dashboard;
