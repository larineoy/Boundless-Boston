import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { GardenProvider } from "./GardenProvider";
import "./garden.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GardenProvider>
      <App />
    </GardenProvider>
  </StrictMode>,
);
