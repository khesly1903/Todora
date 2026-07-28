import { useEffect, useRef } from "react";

/** Plays the hero's checkbox-tick draw once on mount, replayable via `play()` (e.g. on click). */
export function useGrowAnimation() {
  const svgRef = useRef<SVGSVGElement>(null);

  function play() {
    const svg = svgRef.current;
    if (!svg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    svg.classList.remove("is-playing");
    void svg.getBoundingClientRect(); // force reflow so the animation restarts
    svg.classList.add("is-playing");
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(play));
    return () => cancelAnimationFrame(id);
  }, []);

  return { svgRef, play };
}
