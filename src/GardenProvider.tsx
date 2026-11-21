import { useEffect, useState, type ReactNode } from "react";
import { PlasmaProvider, type Mood } from "@cruxgarden/plasma-ui";

const garden: Mood = {
  colors: ["#06121d", "#123f43", "#47385f"],
  blend: 8,
  spring: { stiffness: 150, damping: 20 },
};
export function GardenProvider({ children }: { children: ReactNode }) {
  const [still, setStill] = useState(
    () =>
      matchMedia(
        "(max-width: 650px), (prefers-reduced-motion: reduce), (pointer: coarse)",
      ).matches,
  );
  useEffect(() => {
    const media = matchMedia(
      "(max-width: 650px), (prefers-reduced-motion: reduce), (pointer: coarse)",
    );
    const update = () => setStill(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <PlasmaProvider
      maxSurfaces={16}
      mood={garden}
      theme="dark"
      radius={28}
      blend={8}
      frost={0.55}
      tint="#102a38"
      opacity={0.36}
      elevation={0.38}
      rim={0.9}
      rimColor="iridescent"
      rimWidth={1.1}
      shimmer={0.35}
      glow={0.35}
      highlight={0.45}
      grain={0.18}
      backgroundBlur={3}
      pointerDrop={false}
      pointerPull={false}
      quality={0.75}
      freezeOnScroll
      canvas={!still}
      flow={0}
      formIn={!still}
    >
      <div className={still ? "garden-static" : "garden-live"}>{children}</div>
    </PlasmaProvider>
  );
}
