import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PlasmaProvider } from "@cruxgarden/plasma-ui";
import App from "./App";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlasmaProvider
      maxSurfaces={12}
      mood="aurora"
      frost={0.65}
      tint="#111e19"
      opacity={0.7}
      pointerDrop={false}
      pointerPull={false}
      quality={0.7}
      freezeOnScroll
    >
      <App />
    </PlasmaProvider>
  </StrictMode>,
);
