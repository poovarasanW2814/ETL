import { useState } from "react";

import { testPrompt } from "../api/mcpApi";

function PromptTester() {
  const [prompt, setPrompt] = useState("Convert to YYYY-MM-DD");
  const [values, setValues] = useState("12-05-2024\n01/06/2024");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await testPrompt({
        prompt,
        values: values.split("\n").map((value) => value.trim()),
      });
      setResult(response);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ?? "Unable to test the supplied prompt.",
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="glass-panel px-6 py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">
          Prompt playground
        </p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100">
          Test date prompts before running ETL jobs
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Enter sample values and a natural-language instruction to preview how the MCP
          service resolves the target format and transforms the data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-panel px-6 py-6">
          <label className="block text-sm font-semibold text-ink dark:text-slate-100">
            Prompt
          </label>
          <input
            type="text"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />

          <label className="mt-6 block text-sm font-semibold text-ink dark:text-slate-100">
            Input values
          </label>
          <textarea
            value={values}
            onChange={(event) => setValues(event.target.value)}
            rows={10}
            className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-4 font-mono text-sm text-ink outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="One value per line"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
          >
            {loading ? "Testing..." : "Run prompt test"}
          </button>
        </div>

        <div className="glass-panel px-6 py-6">
          <h3 className="text-lg font-extrabold text-ink dark:text-slate-100">Output preview</h3>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          ) : null}

          {result ? (
            <div className="mt-5 space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Prompt inspector
                </p>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{result.prompt}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Detected format
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                      {result.detected_format}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Target format
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                      {result.target_format ?? "Unresolved"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400">
                  <span>Source</span>
                  <span>Output</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {values.split("\n").map((sourceValue, index) => (
                    <div
                      key={`${sourceValue}-${index}`}
                      className="grid grid-cols-2 gap-4 bg-white px-4 py-3 text-sm dark:bg-slate-900"
                    >
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {sourceValue || "N/A"}
                      </span>
                      <span className="font-mono text-ink dark:text-slate-100">
                        {result.transformed_values[index] ?? "N/A"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
              Run a prompt test to preview transformation behavior.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

export default PromptTester;
