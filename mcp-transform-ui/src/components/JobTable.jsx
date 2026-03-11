import { useNavigate } from "react-router-dom";

import StatusBadge from "./StatusBadge";

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
}

function formatNumber(value) {
  if (value === undefined || value === null) {
    return "N/A";
  }

  return value.toLocaleString();
}

function formatSeconds(value) {
  if (value === undefined || value === null) {
    return "N/A";
  }

  return `${value}s`;
}

function JobTable({ jobs }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-panel transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50/90 dark:bg-slate-950/80">
            <tr className="text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <th className="px-5 py-4">Job ID</th>
              <th className="px-5 py-4">Pipeline</th>
              <th className="px-5 py-4">Batch</th>
              <th className="px-5 py-4">Rows</th>
              <th className="px-5 py-4">Progress</th>
              <th className="px-5 py-4">Time</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {jobs.map((job) => (
              <tr
                key={job.job_id}
                className="cursor-pointer transition hover:bg-amber-50/60 dark:hover:bg-slate-800/70"
                onClick={() => navigate(`/jobs/${job.job_id}`)}
              >
                <td className="px-5 py-4 font-mono text-sm font-semibold text-ink dark:text-slate-100">
                  {job.job_id}
                </td>
                <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                  {job.pipeline_id ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/pipelines/${job.pipeline_id}`);
                      }}
                      className="font-semibold text-amber-700 transition hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                      {job.pipeline_id}
                    </button>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">{job.batch_id ?? "N/A"}</td>
                <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                  {formatNumber(job.metrics?.rows_processed)}
                </td>
                <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                  {job.progress?.progress ?? 0}%
                </td>
                <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                  {formatSeconds(job.metrics?.processing_time_seconds)}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                  {formatDate(job.timestamps?.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default JobTable;
