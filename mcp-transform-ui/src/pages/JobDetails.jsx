import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  deleteJob,
  getFailedRecords,
  getJobEventsWebSocketUrl,
  getJobDetails,
  getJobLogs,
  getJobStatus,
  getPreview,
  retryJob,
} from "../api/mcpApi";
import Loader from "../components/Loader";
import LogsPanel from "../components/LogsPanel";
import ProgressBar from "../components/ProgressBar";
import StatusBadge from "../components/StatusBadge";

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
}

function formatValue(value, suffix = "") {
  if (value === undefined || value === null) {
    return "N/A";
  }

  return `${value}${suffix}`;
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-extrabold text-ink dark:text-slate-100">{value}</p>
    </div>
  );
}

function JobDetails() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [failedRecords, setFailedRecords] = useState([]);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const reconnectTimeoutRef = useRef(null);

  const loadDetails = useCallback(async () => {
    try {
      const [details, status, logData, failedData, previewData] = await Promise.all([
        getJobDetails(jobId),
        getJobStatus(jobId),
        getJobLogs(jobId),
        getFailedRecords(jobId),
        getPreview(jobId),
      ]);

      setJob(details);
      setStatusData(status);
      setLogs(logData.logs ?? []);
      setFailedRecords(failedData.records ?? []);
      setPreview(previewData.columns ?? []);
      setError("");
    } catch (fetchError) {
      setError(
        fetchError.response?.data?.detail ??
          "Unable to load job details. Ensure the backend exposes /api/v1/mcp-jobs/{job_id}.",
      );
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    let socket;
    let isUnmounted = false;

    const connect = () => {
      socket = new WebSocket(getJobEventsWebSocketUrl(jobId));

      socket.onmessage = async (event) => {
        const payload = JSON.parse(event.data);

        if (payload.event_type === "job_log") {
          setLogs((currentLogs) => [...currentLogs, payload].slice(-500));
          return;
        }

        if (payload.event_type === "job_deleted") {
          navigate("/");
          return;
        }

        setStatusData((currentStatus) => ({
          ...(currentStatus ?? {}),
          ...payload,
          metrics: payload.metrics ?? currentStatus?.metrics,
          progress: payload.progress ?? currentStatus?.progress,
          timestamps: {
            ...(currentStatus?.timestamps ?? {}),
            ...(payload.timestamps ?? {}),
          },
        }));

        if (payload.status === "SUCCESS" || payload.status === "FAILED") {
          try {
            const [details, status, logData, failedData, previewData] = await Promise.all([
              getJobDetails(jobId),
              getJobStatus(jobId),
              getJobLogs(jobId),
              getFailedRecords(jobId),
              getPreview(jobId),
            ]);

            if (isUnmounted) {
              return;
            }

            setJob(details);
            setStatusData(status);
            setLogs(logData.logs ?? []);
            setFailedRecords(failedData.records ?? []);
            setPreview(previewData.columns ?? []);
          } catch {
            if (!isUnmounted) {
              setError("Unable to refresh final job state.");
            }
          }
        }
      };

      socket.onclose = () => {
        if (isUnmounted) {
          return;
        }

        reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [jobId, navigate]);

  const mergedJob = {
    ...(job ?? {}),
    ...(statusData ?? {}),
    metrics: statusData?.metrics ?? job?.metrics,
    timestamps: statusData?.timestamps ?? job?.timestamps,
    payload: job?.payload ?? statusData?.payload,
  };

  const handleDownloadLogs = () => {
    const content = logs
      .map((log) => `[${new Date(log.timestamp).toLocaleString()}] ${log.level} ${log.message}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${jobId}-logs.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this job from the monitoring dashboard?");
    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      await deleteJob(jobId);
      navigate("/");
    } catch (deleteError) {
      setError(deleteError.response?.data?.detail ?? "Unable to delete this job.");
    } finally {
      setDeleting(false);
    }
  };

  const handleRetry = async () => {
    try {
      setRetrying(true);
      const data = await retryJob(jobId);
      navigate(`/jobs/${data.job_id}`);
    } catch (retryError) {
      setError(retryError.response?.data?.detail ?? "Unable to retry this job.");
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return <Loader label="Fetching job details..." />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/" className="text-sm font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300">
          Back to dashboard
        </Link>
        <div className="glass-panel border-rose-200 px-6 py-8 text-rose-700 dark:border-rose-900/70 dark:text-rose-300">{error}</div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <Link to="/" className="inline-flex text-sm font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300">
        Back to dashboard
      </Link>

      <div className="glass-panel px-6 py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">
              Job details
            </p>
            <h2 className="mt-2 break-all font-mono text-2xl font-extrabold text-ink dark:text-slate-100">
              {mergedJob.job_id || jobId}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StatusBadge status={mergedJob.status} />
              <span className="text-sm text-slate-500 dark:text-slate-400">Live WebSocket updates</span>
              {mergedJob.pipeline_id ? (
                <Link
                  to={`/pipelines/${mergedJob.pipeline_id}`}
                  className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                >
                  View pipeline history
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-950"
              >
                {retrying ? "Retrying..." : "Retry job"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete job"}
              </button>
            </div>
          </div>

          <div className="grid min-w-[280px] grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard label="Pipeline" value={mergedJob.pipeline_id ?? "N/A"} />
            <StatCard label="Batch" value={mergedJob.batch_id ?? "N/A"} />
            <StatCard
              label="Rows processed"
              value={formatValue(mergedJob.metrics?.rows_processed)}
            />
            <StatCard
              label="Columns processed"
              value={formatValue(mergedJob.metrics?.columns_processed)}
            />
          </div>
        </div>
      </div>

      <div className="glass-panel px-6 py-6">
        <h3 className="text-lg font-extrabold text-ink dark:text-slate-100">Progress</h3>
        <div className="mt-5">
          <ProgressBar
            progress={mergedJob.progress?.progress}
            processedRows={mergedJob.progress?.processed_rows}
            totalRows={mergedJob.progress?.total_rows}
            etaSeconds={mergedJob.progress?.estimated_seconds_remaining}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel px-6 py-6">
          <h3 className="text-lg font-extrabold text-ink dark:text-slate-100">Runtime metrics</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Processing time"
              value={formatValue(mergedJob.metrics?.processing_time_seconds, "s")}
            />
            <StatCard label="Worker" value={mergedJob.worker ?? "N/A"} />
            <StatCard
              label="Created"
              value={formatDate(mergedJob.timestamps?.created_at)}
            />
            <StatCard
              label="Started"
              value={formatDate(mergedJob.timestamps?.started_at)}
            />
            <StatCard
              label="Completed"
              value={formatDate(mergedJob.timestamps?.completed_at)}
            />
          </div>
        </div>

        <div className="glass-panel px-6 py-6">
          <h3 className="text-lg font-extrabold text-ink dark:text-slate-100">Prompt inspector</h3>
          <div className="mt-5 space-y-4">
            {mergedJob.prompt_insights?.length ? (
              mergedJob.prompt_insights.map((insight) => (
                <div
                  key={`${insight.source_column}-${insight.target_column}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800/70"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Column
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                    {insight.source_column} {"->"} {insight.target_column}
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Prompt
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {insight.prompt ?? "N/A"}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Detected format
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                        {insight.detected_format}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Target format
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                        {insight.target_format ?? "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
               <p className="text-sm text-slate-500 dark:text-slate-400">No prompt metadata available.</p>
            )}
          </div>
        </div>
      </div>

      <LogsPanel logs={logs} onDownload={handleDownloadLogs} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel px-6 py-6">
          <h3 className="text-lg font-extrabold text-ink dark:text-slate-100">Failed records</h3>
          <div className="mt-5 max-h-[320px] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Row</th>
                  <th className="px-4 py-3">Column</th>
                  <th className="px-4 py-3">Source value</th>
                  <th className="px-4 py-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {failedRecords.length ? (
                  failedRecords.map((record, index) => (
                    <tr key={`${record.row}-${index}`}>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{record.row}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{record.source_column}</td>
                      <td className="px-4 py-3 font-mono text-sm text-slate-700 dark:text-slate-300">
                        {record.source_value ?? "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-rose-600 dark:text-rose-400">{record.error}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      No failed records captured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel px-6 py-6">
          <h3 className="text-lg font-extrabold text-ink dark:text-slate-100">Transformation preview</h3>
          <div className="mt-5 space-y-4">
            {preview.length ? (
              preview.map((column) => (
                <div
                  key={`${column.source_column}-${column.target_column}`}
                   className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900"
                 >
                   <p className="text-sm font-semibold text-ink dark:text-slate-100">
                     {column.source_column} {"->"} {column.target_column}
                   </p>
                  <div className="mt-3 space-y-2">
                    {column.samples.map((sample, index) => (
                      <div
                        key={`${column.target_column}-${index}`}
                         className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                       >
                         <span className="font-mono">{sample.source_value ?? "N/A"}</span>
                         <span className="font-mono text-ink dark:text-slate-100">{sample.transformed_value ?? "N/A"}</span>
                       </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
               <p className="text-sm text-slate-500 dark:text-slate-400">No preview data available yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default JobDetails;
