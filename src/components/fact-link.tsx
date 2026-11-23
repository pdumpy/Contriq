"use client";
import type { ReactNode } from "react";
/** Open the exact source record before navigating to its normalized fact. */
export function FactLink({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <a
      href={`#fact-${id}`}
      className="mono"
      onClick={() => {
        const fact = document.getElementById(`fact-${id}`);
        let ancestor = fact?.parentElement;
        while (ancestor) {
          if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
          ancestor = ancestor.parentElement;
        }
      }}
    >
      {children}
    </a>
  );
}
