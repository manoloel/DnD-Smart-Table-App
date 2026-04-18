import { useAppStore } from "../store/useAppStore";

const statusStyles = {
  connected: "border-signal-green/40 bg-signal-green/10 text-signal-green",
  connecting: "border-signal-amber/40 bg-signal-amber/10 text-signal-amber",
  degraded: "border-signal-amber/40 bg-signal-amber/10 text-signal-amber",
  offline: "border-signal-red/40 bg-signal-red/10 text-signal-red",
};

export function ConnectionBadge() {
  const device = useAppStore((state) => state.device);

  return (
    <div className={`rounded-lg border px-4 py-3 text-right ${statusStyles[device.connection]}`}>
      <p className="text-sm font-black uppercase">{device.connection}</p>
      <p className="mt-1 text-xs opacity-80">
        {device.ip}:{device.restPort} REST / {device.wsPort} WS
      </p>
    </div>
  );
}
