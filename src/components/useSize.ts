"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Measure a container so charts can be drawn at real pixel sizes. Scaling an
 * SVG with `preserveAspectRatio` would stretch the type along with the marks.
 */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
