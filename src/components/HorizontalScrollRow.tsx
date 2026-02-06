import { useRef, useState, type PropsWithChildren } from "react";

type HorizontalScrollRowProps = PropsWithChildren<{
  className?: string;
}>;

export default function HorizontalScrollRow({
  className = "",
  children
}: HorizontalScrollRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    moved: false
  });
  const suppressClickUntilRef = useRef(0);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const element = rowRef.current;
    if (!element) return;

    dragRef.current.pointerId = event.pointerId;
    dragRef.current.startX = event.clientX;
    dragRef.current.startScrollLeft = element.scrollLeft;
    dragRef.current.moved = false;
    setDragging(true);
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Ignore if pointer capture is unavailable.
    }
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;
    const element = rowRef.current;
    if (!element) return;

    const deltaX = event.clientX - dragRef.current.startX;
    if (!dragRef.current.moved && Math.abs(deltaX) > 4) {
      dragRef.current.moved = true;
    }
    element.scrollLeft = dragRef.current.startScrollLeft - deltaX;
    event.preventDefault();
  };

  const stopDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = rowRef.current;
    if (!element) return;
    if (dragRef.current.pointerId !== event.pointerId) return;

    if (dragRef.current.moved) {
      suppressClickUntilRef.current = Date.now() + 220;
    }

    try {
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore if pointer capture is unavailable.
    }

    dragRef.current.pointerId = -1;
    dragRef.current.moved = false;
    setDragging(false);
  };

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (Date.now() < suppressClickUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const element = rowRef.current;
    if (!element) return;
    const canScrollHorizontally = element.scrollWidth > element.clientWidth + 1;
    if (!canScrollHorizontally) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    const previous = element.scrollLeft;
    element.scrollLeft += event.deltaY;
    if (element.scrollLeft !== previous) {
      event.preventDefault();
    }
  };

  return (
    <div
      ref={rowRef}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onClickCapture={handleClickCapture}
      onWheel={handleWheel}
      className={`${className} ${dragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
    >
      {children}
    </div>
  );
}
