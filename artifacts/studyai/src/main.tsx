import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// In production (VITE_CLERK_PROXY_URL is only set for production),
// redirect any non-canonical domain to study.ia.br
const proxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const hostname = window.location.hostname;
const isCanonical = hostname === "study.ia.br" || hostname === "www.study.ia.br" || hostname === "localhost" || hostname === "127.0.0.1";

if (proxyUrl && !isCanonical) {
  window.location.replace(
    `https://study.ia.br${window.location.pathname}${window.location.search}${window.location.hash}`
  );
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
