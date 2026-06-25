import type { RunnerApiResponse } from "./types";
import { getRunnerServerConfig } from "./config.server";

export class RunnerApiError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = "RunnerApiError";
    this.statusCode = statusCode;
  }
}

export const runnerRequest = async <TData>(
  path: string,
  init: RequestInit = {},
): Promise<TData> => {
  const config = getRunnerServerConfig();
  const headers = new Headers(init.headers);
  headers.set("x-api-key", config.apiKey);

  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as RunnerApiResponse<TData> & { message?: string })
    : null;

  if (!response.ok) {
    throw new RunnerApiError(payload?.message ?? `Runner request failed: ${response.status}`, response.status);
  }

  if (!payload) {
    throw new RunnerApiError("Runner returned a non-JSON response", response.status);
  }

  return payload.data;
};

export const runnerJsonRequest = async <TData>(
  path: string,
  body: unknown,
  method = "POST",
): Promise<TData> => {
  return runnerRequest<TData>(path, {
    method,
    body: JSON.stringify(body),
  });
};
