// Singleton Socket.IO konekcija za live chat podršku. Dijeli se između
// korisničkog inboxa i admin panela. Auth ide preko httpOnly cookie-a
// (`access_token`) koji browser šalje uz withCredentials.
import { io, type Socket } from "socket.io-client";
import { getBackendUrl } from "src/utils/backendUrl";

let socket: Socket | null = null;

export function getSupportSocket(): Socket {
  if (!socket) {
    socket = io(getBackendUrl(), {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
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
