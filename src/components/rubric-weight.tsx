"use client";

import { useEffect, useId, useState } from "react";
import type { MetricDefinition } from "@/types";

export function RubricWeight({
  symbol,
  label,
  weight,
  metrics,
}: {
  symbol: string;
  label: string;
  weight: number;
  metrics: Pick<MetricDefinition, "key" | "label" | "weight">[];
}) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const visible = hovered || expanded;

  useEffect(() => {
    if (!visible) return;
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setHovered(false);
        setExpanded(false);
      }
    }
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [visible]);

  return (
    <li onPointerLeave={() => setHovered(false)}>
      <button
        type="button"
        className="rubric-weight-trigger"
        aria-expanded={visible}
        aria-controls={id}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onClick={() => {
          setHovered(false);
          setExpanded(!expanded);
        }}
        onBlur={() => setExpanded(false)}
      >
        <var aria-hidden="true">{symbol}</var>
        <span>{label}</span>
        <span className="rubric-weight-percent">{weight}%</span>
      </button>
      <div className="rubric-weight-popover" id={id} hidden={!visible}>
        <div className="rubric-weight-card">
          <p>
            Overall points <span aria-hidden="true">·</span> Metric share
          </p>
          <ul>
            {metrics.map((metric) => (
              <li key={metric.key}>
                <span>{metric.label}</span>
                <span className="rubric-metric-weight">
                  <strong>{(weight * metric.weight) / 100}</strong>
                  <small>{metric.weight}%</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}
