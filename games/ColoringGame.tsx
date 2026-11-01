"use client";

import { useEffect, useRef, useState } from "react";
import type { ColorOp, RegionFill } from "@/types";
import { buildLineMask, floodFill, pixelFromUnit } from "@/games/logic/flood-fill";
import { COLORING_PALETTE, hexToRgb, type PaletteId } from "@/games/logic/palette";
import { Button, cx } from "@/components/ui";
import { translateMessage, useLocale } from "@/lib/i18n";
import { ensureSession } from "@/lib/session";
import { useRoom } from "@/lib/socket-context";

const PAGE = "/coloring/frogs.png";

interface PageBuffer {
  width: number;
  height: number;
  original: Uint8ClampedArray;
  mask: Uint8Array;
  image: ImageData;
}

export function ColoringGame() {
  const { t } = useLocale();
  const { state, sendAction, socket } = useRoom();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<PageBuffer | null>(null);
  const fillsRef = useRef<RegionFill[]>([]);
  const [colorId, setColorId] = useState<PaletteId>("purple");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [donePreview, setDonePreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const game = state?.game?.kind === "coloring" ? state.game : null;
  const color = COLORING_PALETTE.find((swatch) => swatch.id === colorId)?.hex ?? COLORING_PALETTE[0].hex;
  const saveName = `duolio-${game?.imageId ?? "frogs"}.png`;

  function redraw(fills: RegionFill[]) {
    const canvas = canvasRef.current;
    const page = pageRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !page || !context) return;
    page.image.data.set(page.original);
    for (const fill of fills) paintFill(page, fill);
    context.putImageData(page.image, 0, 0);
  }

  function openDoneModal() {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    redraw(fillsRef.current);
    setConfirmEmpty(false);
    setDonePreview(canvas.toDataURL("image/png"));
  }

  function closeDoneModal() {
    setDonePreview(null);
  }

  function onFinish() {
    if (!ready) return;
    if (fillsRef.current.length === 0) {
      setConfirmEmpty(true);
      return;
    }
    openDoneModal();
  }

  function savePng() {
    if (!donePreview) return;
    downloadPng(donePreview, saveName);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !game) return;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      pageRef.current = {
        width: canvas.width,
        height: canvas.height,
        original: new Uint8ClampedArray(imageData.data),
        mask: buildLineMask(imageData.data, canvas.width, canvas.height),
        image: imageData,
      };
      setFailed(false);
      setReady(true);
    };
    image.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    image.src = PAGE;
    return () => {
      cancelled = true;
    };
    // Reload only when a coloring game is opened, not on every fill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.kind]);

  useEffect(() => {
    if (!ready || !game) return;
    fillsRef.current = game.fills.map((fill) => ({ ...fill }));
    redraw(fillsRef.current);
    // revision is the server signal that the fill list was replaced
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, game?.revision]);

  useEffect(() => {
    if (!socket) return;
    const onOp = (op: ColorOp) => {
      if (op.op !== "fill") return;
      if (fillsRef.current.some((fill) => fill.id === op.fill.id)) return;
      fillsRef.current = [...fillsRef.current, op.fill];
      const page = pageRef.current;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!page || !context) return;
      paintFill(page, op.fill);
      context.putImageData(page.image, 0, 0);
    };
    socket.on("color:op", onOp);
    return () => {
      socket.off("color:op", onOp);
    };
  }, [socket]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const block = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };
    canvas.addEventListener("touchstart", block, { passive: false });
    canvas.addEventListener("touchmove", block, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", block);
      canvas.removeEventListener("touchmove", block);
    };
  }, [game?.kind]);

  useEffect(() => {
    if (!confirmClear && !confirmEmpty && !donePreview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setConfirmClear(false);
      setConfirmEmpty(false);
      setDonePreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmClear, confirmEmpty, donePreview]);

  function paintAt(clientX: number, clientY: number) {
    if (state?.phase !== "playing" || !ready) return;
    const canvas = canvasRef.current;
    const page = pageRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !page || !context) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const localX = ((clientX - rect.left) / rect.width) * canvas.width;
    const localY = ((clientY - rect.top) / rect.height) * canvas.height;
    if (localX < 0 || localY < 0 || localX >= canvas.width || localY >= canvas.height) return;

    const unitX = (Math.floor(localX) + 0.5) / canvas.width;
    const unitY = (Math.floor(localY) + 0.5) / canvas.height;
    const fill: RegionFill = {
      id: crypto.randomUUID(),
      playerId: ensureSession().playerId,
      color,
      x: unitX,
      y: unitY,
    };
    const changed = paintFill(page, fill);
    if (changed === 0) return;
    context.putImageData(page.image, 0, 0);
    fillsRef.current = [...fillsRef.current, fill];
    setMessage(null);
    void sendAction({ type: "color:fill", id: fill.id, color: fill.color, x: fill.x, y: fill.y }, true).then((ack) => {
      if (ack.ok) {
        if (!fillsRef.current.some((item) => item.id === fill.id)) {
          fillsRef.current = [...fillsRef.current, fill];
          const live = pageRef.current;
          const liveContext = canvasRef.current?.getContext("2d");
          if (live && liveContext) {
            paintFill(live, fill);
            liveContext.putImageData(live.image, 0, 0);
          }
        }
        return;
      }
      fillsRef.current = fillsRef.current.filter((item) => item.id !== fill.id);
      redraw(fillsRef.current);
      setMessage(ack.message);
    });
  }

  if (!game) return null;

  return (
    <div className="mx-auto w-full">
      <div className="mx-auto w-full" style={{ maxWidth: "min(100%, calc(68dvh * 3 / 2))" }}>
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[28px] border border-line bg-[#fffef8] shadow-card">
          <canvas
            ref={canvasRef}
            aria-label={t.coloringCanvas}
            className="absolute inset-0 h-full w-full touch-none select-none"
            onContextMenu={(event) => event.preventDefault()}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse" && event.button !== 0) return;
              event.preventDefault();
              paintAt(event.clientX, event.clientY);
            }}
          />
          {!ready ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-medium text-muted">
              {failed ? t.coloringLoadError : t.loading}
            </div>
          ) : null}
        </div>
      </div>

      <div role="radiogroup" aria-label={t.palette} className="mt-3 flex flex-wrap justify-center gap-2">
        {COLORING_PALETTE.map((swatch) => {
          const selected = swatch.id === colorId;
          return (
            <button
              key={swatch.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={t.colors[swatch.id]}
              title={t.colors[swatch.id]}
              onClick={() => setColorId(swatch.id)}
              className={cx(
                "rounded-full border transition",
                selected
                  ? "z-10 size-11 border-ink ring-2 ring-ink ring-offset-2 ring-offset-paper sm:size-12"
                  : "size-8 border-black/15 sm:size-9",
              )}
              style={{ background: swatch.hex }}
            />
          );
        })}
      </div>
      <p className="mt-2 text-center text-sm font-semibold">{t.colors[colorId]}</p>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => {
            void sendAction({ type: "color:undo" }, true).then((ack) => setMessage(ack.ok ? null : ack.message));
          }}
          className="h-11 rounded-2xl bg-card px-4 text-sm font-semibold"
        >
          {t.undo}
        </button>
        <button
          type="button"
          onClick={() => setConfirmClear(true)}
          className="h-11 rounded-2xl bg-card px-4 text-sm font-semibold"
        >
          {t.clear}
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="h-11 rounded-2xl bg-accent px-4 text-sm font-semibold text-accent-ink"
        >
          {t.finish}
        </button>
      </div>
      {message ? <p className="mt-2 text-center text-sm font-medium text-bad">{translateMessage(message, t)}</p> : null}

      {confirmClear ? (
        <div
          className="fixed inset-0 z-40 grid place-items-end bg-ink/35 p-4 sm:place-items-center"
          role="presentation"
          onClick={() => setConfirmClear(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-coloring-title"
            className="animate-rise w-full max-w-sm rounded-[28px] bg-card p-6 text-center shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="clear-coloring-title" className="text-2xl font-bold">
              {t.clearAsk}
            </h2>
            <p className="mt-2 text-sm font-medium text-muted">{t.clearHint}</p>
            <div className="mt-6 space-y-2">
              <Button
                className="w-full"
                onClick={() => {
                  setConfirmClear(false);
                  void sendAction({ type: "color:clear" }, true).then((ack) => {
                    if (!ack.ok) setMessage(ack.message);
                  });
                }}
              >
                {t.clear}
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setConfirmClear(false)}>
                {t.cancel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmEmpty ? (
        <div
          className="fixed inset-0 z-40 grid place-items-end bg-ink/35 p-4 sm:place-items-center"
          role="presentation"
          onClick={() => setConfirmEmpty(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="empty-coloring-title"
            className="animate-rise w-full max-w-sm rounded-[28px] bg-card p-6 text-center shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="empty-coloring-title" className="text-2xl font-bold">
              {t.emptyColorAsk}
            </h2>
            <p className="mt-2 text-sm font-medium text-muted">{t.emptyColorHint}</p>
            <div className="mt-6 space-y-2">
              <Button className="w-full" onClick={openDoneModal}>
                {t.saveAnyway}
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setConfirmEmpty(false)}>
                {t.cancel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {donePreview ? (
        <div
          className="fixed inset-0 z-40 grid place-items-end bg-ink/35 p-4 sm:place-items-center"
          role="presentation"
          onClick={closeDoneModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="done-coloring-title"
            className="animate-rise w-full max-w-sm rounded-[28px] bg-card p-6 text-center shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="done-coloring-title" className="text-2xl font-bold">
              {t.coloringDoneTitle}
            </h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-[#fffef8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={donePreview} alt="" className="mx-auto max-h-56 w-full object-contain" />
            </div>
            <div className="mt-6 space-y-2">
              <Button className="w-full" onClick={savePng}>
                {t.saveImage}
              </Button>
              <Button variant="secondary" className="w-full" onClick={closeDoneModal}>
                {t.colorAgain}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function paintFill(page: PageBuffer, fill: RegionFill) {
  return floodFill(
    page.image.data,
    page.original,
    page.mask,
    page.width,
    page.height,
    pixelFromUnit(fill.x, page.width),
    pixelFromUnit(fill.y, page.height),
    hexToRgb(fill.color),
  );
}

function downloadPng(dataUrl: string, filename: string) {
  void fetch(dataUrl)
    .then((response) => response.blob())
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      triggerAnchorDownload(objectUrl, filename);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
    })
    .catch(() => {
      triggerAnchorDownload(dataUrl, filename);
    });
}

function triggerAnchorDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
