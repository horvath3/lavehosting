import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getRunnerSocket = (): Socket => {
  if (socket?.connected || socket) {
    return socket;
  }

  const url = import.meta.env.VITE_LAVE_RUNNER_URL ?? "http://127.0.0.1:3000";
  const apiKey = import.meta.env.VITE_LAVE_RUNNER_API_KEY;

  socket = io(url, {
    auth: { apiKey },
    transports: ["websocket", "polling"],
  });

  return socket;
};

export const disconnectRunnerSocket = (): void => {
  socket?.disconnect();
  socket = null;
};
