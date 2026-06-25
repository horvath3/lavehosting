import { io } from "socket.io-client";
import { getRunnerServerConfig } from "./config.server";

export const sendRunnerConsoleCommand = async (serverId: string, command: string): Promise<void> => {
  const config = getRunnerServerConfig();

  await new Promise<void>((resolve, reject) => {
    const socket = io(config.baseUrl, {
      auth: { apiKey: config.apiKey },
      transports: ["websocket", "polling"],
      forceNew: true,
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error("Runner console command timed out"));
    }, 5000);

    socket.on("connect", () => {
      socket.emit("console:command", { serverId, command });
    });

    socket.on("connect_error", (error) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(error);
    });

    socket.on("console:status", (payload: unknown) => {
      if (!isStatusPayload(payload) || payload.serverId !== serverId) {
        return;
      }

      clearTimeout(timeout);
      socket.disconnect();

      if (payload.success) {
        resolve();
        return;
      }

      reject(new Error(payload.message));
    });
  });
};

const isStatusPayload = (payload: unknown): payload is { success: boolean; serverId?: string; message: string } => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const value = payload as Record<string, unknown>;
  return typeof value.success === "boolean" && typeof value.message === "string";
};
