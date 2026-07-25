// Singleton Socket.IO konekcija za live chat podršku. Dijeli se između
// korisničkog inboxa i admin panela. Auth ide preko httpOnly cookie-a
// (`access_token`) koji browser šalje uz withCredentials.
import { io, type Socket } from "socket.io-client";
import { getBackendUrl } from "src/utils/backendUrl";

let socket: Socket | null = null;

// Produkcijski backend je iza Apache + Phusion Passenger (shared hosting) koji
// ne propušta Upgrade header, pa WebSocket handshake vraća 400. Zato na
// produkciji forsiramo čisti polling bez pokušaja upgrade-a; u developmentu
// ostaje websocket radi performansi.
const isProd = process.env.NODE_ENV === "production";

export function getSupportSocket(): Socket {
  if (!socket) {
    socket = io(getBackendUrl(), {
      withCredentials: true,
      autoConnect: false,
      ...(isProd
        ? { transports: ["polling"] as const, upgrade: false }
        : { transports: ["websocket", "polling"] as const }),
    });
  }
  return socket;
}

// Osiguraj da je konekcija aktivna (idempotentno).
export function connectSupportSocket(): Socket {
  const s = getSupportSocket();
  if (!s.connected) s.connect();
  return s;
}
