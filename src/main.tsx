import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { tauri } from "./lib/tauri";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<App />);

window.setTimeout(() => {
  void tauri.appReady().catch(() => undefined);
}, 0);
