const defaultRunnerUrl = "http://127.0.0.1:3000";
const defaultServersRoot = "C:\\Users\\horva\\Documents\\Lave runner\\LaveRunner\\servers";

export const getRunnerServerConfig = () => {
  const baseUrl = process.env.LAVE_RUNNER_URL ?? defaultRunnerUrl;
  const apiKey = process.env.LAVE_RUNNER_API_KEY ?? process.env.VITE_LAVE_RUNNER_API_KEY;

  if (!apiKey) {
    throw new Error("LAVE_RUNNER_API_KEY is not configured");
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    serversRoot: process.env.LAVE_RUNNER_SERVERS_ROOT ?? defaultServersRoot
  };
};
