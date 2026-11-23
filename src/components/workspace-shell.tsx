"use client";

import { useRef, useState, type CSSProperties } from "react";
import { Navigation } from "./navigation";

const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const [resizing, setResizing] = useState(false);
  const drag = useRef({ startX: 0, scale: 1, baseWidth: 226 });

  function resize(value: number) {
    setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, value)));
  }

  return (
    <div
      className="workspace-shell"
      style={{ "--sidebar-scale": scale } as CSSProperties}
      data-sidebar-compact={scale < 0.8}
      data-resizing={resizing}
    >
      <Navigation />
      <div
        className="sidebar-resizer"
        role="separator"
        aria-label="Resize navigation width"
        aria-orientation="vertical"
        aria-controls="contriq-navigation contriq-content"
        aria-valuemin={50}
        aria-valuemax={150}
        aria-valuenow={Math.round(scale * 100)}
        aria-valuetext={`${Math.round(scale * 100)}% of default width`}
        tabIndex={0}
        title="Drag to resize between 50% and 150%. Double-click to reset."
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          drag.current = {
            startX: event.clientX,
            scale,
            baseWidth: Number.parseFloat(
              getComputedStyle(event.currentTarget).getPropertyValue(
                "--sidebar-base-width",
              ),
            ),
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          setResizing(true);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          resize(
            drag.current.scale +
              (event.clientX - drag.current.startX) / drag.current.baseWidth,
          );
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          setResizing(false);
        }}
        onPointerCancel={() => setResizing(false)}
        onLostPointerCapture={() => setResizing(false)}
        onDoubleClick={() => resize(1)}
        onKeyDown={(event) => {
          const next = {
            ArrowLeft: scale - 0.05,
            ArrowRight: scale + 0.05,
            Home: MIN_SCALE,
            End: MAX_SCALE,
            Enter: 1,
          }[event.key];
          if (next === undefined) return;
          event.preventDefault();
          resize(next);
        }}
      />
      {children}
    </div>
  );
}
