import { useEffect } from "react";
import { Esp32TableSocket } from "../lib/ws/esp32TableSocket";
import { MockTableSocket } from "../lib/ws/mockTableSocket";
import { useAppStore } from "../store/useAppStore";

function looksLikeIpAddress(value: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value.trim());
}

function getSocketHost(hostname: string, ip: string) {
  const trimmedHostname = hostname.trim();
  if (!trimmedHostname) return ip;
  if (looksLikeIpAddress(trimmedHostname)) return trimmedHostname;
  return ip || trimmedHostname;
}

export function useTableSocket() {
  const connection = useAppStore((state) => state.device.connection);
  const ip = useAppStore((state) => state.device.ip);
  const hostname = useAppStore((state) => state.settings.hostname);
  const wsPort = useAppStore((state) => state.settings.wsPort);
  const reconnect = useAppStore((state) => state.settings.reconnect);
  const demoMode = useAppStore((state) => state.demoMode);
  const handleTableSocketMessage = useAppStore((state) => state.handleTableSocketMessage);
  const shouldUseRealSocket = connection === "connected" || connection === "degraded";

  useEffect(() => {
    if (demoMode) {
      const socket = new MockTableSocket();
      socket.connect((message) => void handleTableSocketMessage(message));
      return () => socket.disconnect();
    }

    if (!shouldUseRealSocket) {
      return undefined;
    }

    const socketHost = getSocketHost(hostname, ip);
    const socket = new Esp32TableSocket(`ws://${socketHost}:${wsPort}/`, reconnect);
    socket.connect((message) => void handleTableSocketMessage(message));

    return () => socket.disconnect();
  }, [demoMode, handleTableSocketMessage, hostname, ip, reconnect, shouldUseRealSocket, wsPort]);
}
