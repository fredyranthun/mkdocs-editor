/**
 * React Renderer Entry Point
 *
 * Mounts the React app to the DOM
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Wait for DOM to be ready
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
