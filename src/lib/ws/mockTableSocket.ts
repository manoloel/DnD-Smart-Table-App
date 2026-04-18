import { TableSocket, TableSocketMessage } from "./tableSocket";

export class MockTableSocket implements TableSocket {
  private timer?: number;

  connect(onMessage: (message: TableSocketMessage) => void) {
    this.disconnect();
    onMessage({ type: "hello", payload: { message: "mock connected" } });
    this.timer = window.setInterval(() => {
      onMessage({
        type: "temperature",
        payload: {
          temperatureC: 37 + Math.round(Math.random() * 40) / 10,
          fanSpeed: 38 + Math.round(Math.random() * 12),
        },
      });
    }, 5000);
  }

  disconnect() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
