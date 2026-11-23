"use client";

import { useEffect, useRef } from "react";
import { simplexNoise } from "./curtain-noise";

const WORDMARK = "CONTRIQ";
const FONT_FAMILY = '"Times New Roman", Times, "Liberation Serif", serif';
const CELL_SIZE = 3;
const GRID_STEP = 4;
const IDLE = "rgba(255,255,255,.04)";
const ACTIVE_THRESHOLD = 0.24;
const NOISE_SCALE = 0.002;
const NOISE_BLEND = 0.7;
const TRAVEL_SPEED = 0.5;

function sampleWordmark(width: number, height: number) {
  const mask = document.createElement("canvas");
  mask.width = Math.round(width);
  mask.height = Math.round(height);
  const context = mask.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  let fontSize = height * 0.85;
  context.font = `640 ${fontSize}px ${FONT_FAMILY}`;
  const maxWidth = width * 0.98;
  const measuredWidth = context.measureText(WORDMARK).width;
  if (measuredWidth > maxWidth) fontSize *= maxWidth / measuredWidth;
  context.font = `640 ${fontSize}px ${FONT_FAMILY}`;
  context.textBaseline = "middle";
  context.fillStyle = "#fff";

  const left = (width - context.measureText(WORDMARK).width) / 2;
  const baseline = height / 2 + fontSize * 0.02;
  context.fillText("CO", left, baseline);
  context.fillText("TRIQ", left + context.measureText("CON").width, baseline);

  // Use the same seven points as .brand-n, within the serif N's cap height.
  const nLeft = left + context.measureText("CO").width;
  const nWidth = context.measureText("N").width;
  const { actualBoundingBoxAscent, actualBoundingBoxDescent } =
    context.measureText("N");
  const nTop = baseline - actualBoundingBoxAscent;
  const nHeight = actualBoundingBoxAscent + actualBoundingBoxDescent;
  context.beginPath();
  context.moveTo(nLeft, nTop + nHeight);
  for (const [x, y] of [
    [0.4, 0],
    [0.6, 0],
    [1, 1],
    [0.76, 1],
    [0.5, 0.35],
    [0.24, 1],
  ]) {
    context.lineTo(nLeft + x * nWidth, nTop + y * nHeight);
  }
  context.closePath();
  context.fill();

  const pixels = context.getImageData(0, 0, mask.width, mask.height).data;
  const columns = Math.floor((width + 1) / GRID_STEP);
  const rows = Math.floor((height + 1) / GRID_STEP);
  const offsetX = Math.round((width - (columns * GRID_STEP - 1)) / 2);
  const offsetY = Math.round((height - (rows * GRID_STEP - 1)) / 2);
  const dots = [];
  for (let row = 0; row < rows; row += 1) {
    const y = offsetY + row * GRID_STEP;
    for (let column = 0; column < columns; column += 1) {
      const x = offsetX + column * GRID_STEP;
      const pixelX = Math.min(mask.width - 1, Math.max(0, x + 2));
      const pixelY = Math.min(mask.height - 1, Math.max(0, y + 2));
      if (pixels[(pixelY * mask.width + pixelX) * 4 + 3] < 96) continue;
      const hash = Math.sin(column * 127.1 + row * 311.7) * 43_758.5453;
      dots.push({
        x,
        y,
        noiseX: column * NOISE_SCALE,
        noiseY: row * NOISE_SCALE,
        staticNoise: hash - Math.floor(hash),
      });
    }
  }
  return dots;
}

export function FooterCurtain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const spacer = spacerRef.current;
    const inner = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !spacer || !inner || !context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const accent = getComputedStyle(canvas).getPropertyValue("--gold").trim();
    const startedAt = performance.now();
    let dots: ReturnType<typeof sampleWordmark> = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let resizeTimer: ReturnType<typeof setTimeout>;
    let visible = false;

    function draw(ctx: CanvasRenderingContext2D, elapsed: number) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = IDLE;
      for (const dot of dots) ctx.fillRect(dot.x, dot.y, CELL_SIZE, CELL_SIZE);

      ctx.fillStyle = accent;
      const travel = elapsed * TRAVEL_SPEED;
      for (const dot of dots) {
        const noise = simplexNoise(dot.noiseX + travel, dot.noiseY + travel);
        const blended = dot.staticNoise * (1 - NOISE_BLEND) + noise * NOISE_BLEND;
        if (blended < ACTIVE_THRESHOLD) {
          ctx.fillRect(dot.x, dot.y, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    const render = (timestamp: number) => {
      draw(context, (timestamp - startedAt) / 1_000);
      frame = requestAnimationFrame(render);
    };
    const rebuild = () => {
      const bounds = inner.getBoundingClientRect();
      width = Math.max(320, bounds.width);
      height = Math.max(204, bounds.height);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = sampleWordmark(width, height);
      draw(context, reduced.matches ? 8.25 : (performance.now() - startedAt) / 1_000);
    };
    const updateMotion = () => {
      cancelAnimationFrame(frame);
      if (visible && !reduced.matches) frame = requestAnimationFrame(render);
      else if (reduced.matches) draw(context, 8.25);
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateMotion();
    }, { rootMargin: "200px" });
    const resize = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(rebuild, 120);
    });
    rebuild();
    intersection.observe(spacer);
    resize.observe(inner);
    reduced.addEventListener("change", updateMotion);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(resizeTimer);
      intersection.disconnect();
      resize.disconnect();
      reduced.removeEventListener("change", updateMotion);
    };
  }, []);

  return (
    <>
      <div className="footer-curtain" aria-hidden="true">
        <div className="footer-curtain-inner">
          <canvas ref={canvasRef} />
        </div>
      </div>
      <div
        id="pixel-curtain"
        className="footer-curtain-spacer"
        aria-hidden="true"
        ref={spacerRef}
      />
    </>
  );
}
