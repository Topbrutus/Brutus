import {
  createAntmuxX72LiveAquariumBridge
} from "../../src/antmux-x72-live-aquarium-bridge.mjs";

import {
  createReadOnlyLiveEventStream
} from "../../src/read-only-live-event-stream.mjs";

import {
  GENESIS_X72_VISUAL_LAYOUT
} from "./layout-genesis-x72-v01.mjs";

const DEFAULT_WS_URL = "wss://antmux.com/laboratoire/embryon-x72/ws";

function boot() {
  const api = window.BrutusGenesisAquarium;
  const root = document.querySelector("[data-genesis-root]");
  const connectButton = root?.querySelector("[data-connect-runtime]");
  const disconnectButton = root?.querySelector("[data-disconnect-runtime]");
  const liveStatus = root?.querySelector("[data-live-status]");

  if (!api || !root || !connectButton || !disconnectButton || !liveStatus) {
    throw new Error("GENESIS_LIVE_BRIDGE_BOOT_REJECTED: required UI/API missing");
  }

  api.loadLayout(GENESIS_X72_VISUAL_LAYOUT);

  const stream = createReadOnlyLiveEventStream({ capacity: 512 });
  const bridge = createAntmuxX72LiveAquariumBridge({
    sourceEndpoint: "/laboratoire/embryon-x72/ws"
  });

  let socket = null;
  let cursor = 0;

  function setLiveStatus(label) {
    liveStatus.textContent = label;
  }

  function setButtons(connected) {
    connectButton.disabled = connected;
    disconnectButton.disabled = !connected;
  }

  function closeSocket(reason = "DISCONNECTED") {
    const current = socket;
    socket = null;

    if (
      current &&
      (current.readyState === WebSocket.OPEN ||
        current.readyState === WebSocket.CONNECTING)
    ) {
      current.close(1000, "user disconnect");
    }

    setButtons(false);
    setLiveStatus(reason);
  }

  function consumeBridgeResult(result) {
    for (const event of result.EVENTS) {
      stream.append(event);
    }

    if (result.EVENTS.length === 0) {
      setLiveStatus(
        result.BASELINE_ONLY
          ? "BASELINE RÉEL · tick " + result.TICK
          : "LIVE · tick " + result.TICK + " · aucun delta roue"
      );
      return;
    }

    const delta = stream.readAfter(cursor);
    api.consumeDelta(delta);
    cursor = delta.CURSOR_OUT;

    setLiveStatus(
      "LIVE X72 · tick " + result.TICK +
      " · " + result.EVENTS.length + " mouvement(s) réel(s)"
    );
  }

  function connect() {
    if (
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setButtons(true);
    setLiveStatus("CONNEXION AU RUNTIME RÉEL…");

    const ws = new WebSocket(DEFAULT_WS_URL);
    socket = ws;

    ws.addEventListener("open", () => {
      if (socket !== ws) return;
      setLiveStatus("SOCKET RÉEL CONNECTÉ · attente première trame");
    });

    ws.addEventListener("message", event => {
      if (socket !== ws) return;

      try {
        const frame = JSON.parse(event.data);
        const result = bridge.acceptFrame(frame, {
          observedAtUtc: new Date().toISOString()
        });
        consumeBridgeResult(result);
      } catch (error) {
        closeSocket("TRAME REJETÉE · resync requis");
        throw error;
      }
    });

    ws.addEventListener("error", () => {
      if (socket !== ws) return;
      setLiveStatus("ERREUR SOCKET RÉEL");
    });

    ws.addEventListener("close", () => {
      if (socket !== ws) return;
      socket = null;
      setButtons(false);
      setLiveStatus("RUNTIME DÉCONNECTÉ · dernier état gelé");
    });
  }

  connectButton.addEventListener("click", connect);
  disconnectButton.addEventListener("click", () => closeSocket("RUNTIME DÉCONNECTÉ"));

  setButtons(false);
  setLiveStatus("PRÊT · aucune connexion ouverte");

  window.BrutusGenesisLiveX72 = Object.freeze({
    connect,
    disconnect: () => closeSocket("RUNTIME DÉCONNECTÉ"),
    get sourceUrl() {
      return DEFAULT_WS_URL;
    },
    get cursor() {
      return cursor;
    },
    get connected() {
      return socket?.readyState === WebSocket.OPEN;
    }
  });
}

if (window.BrutusGenesisAquarium) {
  boot();
} else {
  window.addEventListener("brutus:genesis-ready", boot, { once: true });
}
