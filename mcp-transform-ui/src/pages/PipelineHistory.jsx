import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getPipelineJobs } from "../api/mcpApi";
import JobTable from "../components/JobTable";
import Loader from "../components/Loader";

function PipelineHistory() {
  const { pipelineId } = useParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  const loadPipelineJobs = useCallback(async () => {
    try {
      const data = await getPipelineJobs(pipelineId, { page, limit });
      setJobs(data.jobs ?? []);
      setTotal(data.total ?? 0);
      setError("");
    } catch (fetchError) {
      setError(
        fetchError.response?.data?.detail ??
          "Unable to load pipeline execution history.",
      );
    } finally {
      setLoading(false);
    }
  }, [limit, page, pipelineId]);

  useEffect(() => {
    loadPipelineJobs();
  }, [loadPipelineJobs]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <section className="space-y-6">
      <Link
        to="/"
        className="inline-flex text-sm font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
      >
        Back to dashboard
      </Link>

      <div className="glass-panel px-6 py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">
          Pipeline execution history
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100">
              {pipelineId}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Review all MCP transformation jobs associated with this ETL pipeline.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-ink px-4 py-3 text-white dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300 dark:text-slate-400">
                Jobs
              </p>
              <p className="mt-1 text-2xl font-extrabold">{total}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-700">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Page
              </p>
              <p className="mt-1 text-2xl font-extrabold text-ink dark:text-slate-100">
                {page}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-700">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Per page
              </p>
              <p className="mt-1 text-2xl font-extrabold text-ink dark:text-slate-100">
                {limit}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>Rows per page</span>
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
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <Loader label="Fetching pipeline history..." /> : null}

      {!loading && error ? (
        <div className="glass-panel border-rose-200 px-6 py-8 text-rose-700 dark:border-rose-900/70 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {!loading && !error && jobs.length === 0 ? (
        <div className="glass-panel px-6 py-10 text-center text-slate-500 dark:text-slate-400">
          No jobs found for this pipeline.
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

export default PipelineHistory;
