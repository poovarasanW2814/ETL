import axios from "axios";

const client = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 30000,
});

const promptTesterClient = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 240000,
});

export function getJobEventsWebSocketUrl(jobId) {
  const baseUrl = new URL(client.defaults.baseURL);
  baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  baseUrl.pathname = "/ws/jobs";

  if (jobId) {
    baseUrl.searchParams.set("jobId", jobId);
  }

  return baseUrl.toString();
}

export async function getJobs(params = {}) {
  const { data } = await client.get("/api/v1/mcp-jobs", {
    params,
  });
  return data;
}

export async function getPipelineJobs(pipelineId, params = {}) {
  const { data } = await client.get(`/api/v1/pipelines/${pipelineId}/jobs`, {
    params,
  });
  return data;
}

export async function getJobAnalytics(params = {}) {
  const { data } = await client.get("/api/v1/mcp-jobs/analytics", {
    params,
  });
  return data;
}

export async function testPrompt(payload) {
  const { data } = await promptTesterClient.post("/api/v1/prompt-tester", payload);
  return data;
}

export async function getJobDetails(jobId) {
  const { data } = await client.get(`/api/v1/mcp-jobs/${jobId}`);
  return data;
}

export async function getJobStatus(jobId) {
  const { data } = await client.get(`/api/v1/transform-status/${jobId}`);
  return data;
}

export async function getJobLogs(jobId) {
  const { data } = await client.get(`/api/v1/mcp-jobs/${jobId}/logs`);
  return data;
}

export async function getFailedRecords(jobId) {
  const { data } = await client.get(`/api/v1/mcp-jobs/${jobId}/failed-records`);
  return data;
}

export async function getPreview(jobId) {
  const { data } = await client.get(`/api/v1/mcp-jobs/${jobId}/preview`);
  return data;
}

export async function retryJob(jobId) {
  const { data } = await client.post(`/api/v1/mcp-jobs/${jobId}/retry`);
  return data;
}

export async function deleteJob(jobId) {
  await client.delete(`/api/v1/mcp-jobs/${jobId}`);
}

export default client;
