function ProgressBar({ progress, processedRows, totalRows, etaSeconds }) {
  const resolvedProgress = Number.isFinite(progress) ? progress : 0;

  return (
    <div className="space-y-3">
      <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${Math.min(Math.max(resolvedProgress, 0), 100)}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-ink dark:text-slate-100">{resolvedProgress}% complete</span>
        <span>
          Rows processed: {(processedRows ?? 0).toLocaleString()} / {(totalRows ?? 0).toLocaleString()}
        </span>
        <span>ETA: {etaSeconds ?? "N/A"}{etaSeconds !== null && etaSeconds !== undefined ? "s" : ""}</span>
      </div>
    </div>
  );
}

export default ProgressBar;
