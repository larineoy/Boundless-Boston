import { useEffect, useRef } from 'react';
import { mountCollegeAtlas } from './mount.js';

/** Inject the installed maplibre-gl module; parent owns sizing and tab chrome. */
export function CollegeAtlas({ maplibre, onCampusChange, className, style }) {
  const host = useRef(null);
  const callback = useRef(onCampusChange);
  callback.current = onCampusChange;
  useEffect(() => {
    const atlas = mountCollegeAtlas(host.current, {
      maplibre,
      onCampusChange: campus => callback.current?.(campus),
    });
    return () => atlas.destroy();
  }, [maplibre]);
  return <div ref={host} className={className} style={{ height: '100%', minHeight: 420, ...style }} />;
}
