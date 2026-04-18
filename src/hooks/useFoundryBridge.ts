import { useEffect } from "react";
import { subscribeFoundryBridge } from "../lib/foundry/foundryBridge";
import { useAppStore } from "../store/useAppStore";

let subscribed = false;

export function useFoundryBridge() {
  const handleFoundryEvent = useAppStore((state) => state.handleFoundryEvent);
  const handleFoundrySocketStatus = useAppStore((state) => state.handleFoundrySocketStatus);
  const configureFoundryIntegration = useAppStore((state) => state.configureFoundryIntegration);
  const pushLog = useAppStore((state) => state.pushLog);

  useEffect(() => {
    if (subscribed) return;
    subscribed = true;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void configureFoundryIntegration();
    void subscribeFoundryBridge({
      onEvent: (event) => void handleFoundryEvent(event),
      onBridge: (event) => {
        if (event.type === "listening") {
          pushLog({ level: "info", source: "foundry", message: `Foundry bridge listening at ${event.endpoint}` });
        } else {
          pushLog({ level: "error", source: "foundry", message: event.message ?? "Foundry bridge error" });
        }
      },
      onSocket: handleFoundrySocketStatus,
    })
      .then((unlisten) => {
        if (cancelled) {
          unlisten();
          return;
        }
        cleanup = unlisten;
      })
      .catch((error) => {
        subscribed = false;
        pushLog({ level: "error", source: "foundry", message: `Foundry bridge listener failed: ${String(error)}` });
      });

    return () => {
      cancelled = true;
      cleanup?.();
      subscribed = false;
    };
  }, [configureFoundryIntegration, handleFoundrySocketStatus, handleFoundryEvent, pushLog]);
}
