function LogsPanel({ logs, onDownload }) {
  return (
    <div className="glass-panel px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-extrabold text-ink dark:text-slate-100">Job logs</h3>
        <button
          type="button"
          onClick={onDownload}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
        >
          Download logs
        </button>
      </div>

      <div className="mt-5 max-h-[360px] overflow-auto rounded-2xl bg-slate-950 p-4 font-mono text-sm text-slate-100">
        {logs.length ? (
          logs.map((log, index) => (
            <div key={`${log.timestamp}-${index}`} className="border-b border-slate-800 py-2 last:border-b-0">
              <span className="text-slate-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{" "}
              <span className="font-bold text-amber-300">{log.level}</span>{" "}
              <span>{log.message}</span>
            </div>
          ))
        ) : (
          <p className="text-slate-400">No logs captured yet.</p>
        )}
      </div>
    </div>
  );
}

export default LogsPanel;
