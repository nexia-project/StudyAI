import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// In production builds, redirect any non-canonical domain to study.ia.br.
// import.meta.env.PROD is true only in production (Vite build), false in dev server.
const hostname = window.location.hostname;
const isCanonical =
  hostname === "study.ia.br" ||
  hostname === "www.study.ia.br" ||
  hostname === "localhost" ||
  hostname === "127.0.0.1";

if (import.meta.env.PROD && !isCanonical) {
  window.location.replace(
    `https://study.ia.br${window.location.pathname}${window.location.search}${window.location.hash}`
  );
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
