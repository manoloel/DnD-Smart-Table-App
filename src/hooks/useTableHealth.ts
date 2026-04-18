import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";

export function useTableHealth() {
  const device = useAppStore((state) => state.device);

  return useMemo(() => {
    const hot = device.temperatureC >= 48;
    const degraded = device.connection !== "connected";
    const tone: "amber" | "green" = degraded || hot ? "amber" : "green";
    return {
      degraded,
      hot,
      tone,
      labelKey: degraded ? "manualModeAvailable" : hot ? "coolingWatch" : "tableReady",
    };
  }, [device.connection, device.temperatureC]);
}
