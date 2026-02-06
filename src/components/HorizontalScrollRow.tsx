import { useEffect, useRef, useState, type PropsWithChildren } from "react";

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
    active: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false
  });
  const suppressClickUntilRef = useRef(0);
  const DRAG_THRESHOLD = 8;

  const startDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const element = rowRef.current;
    if (!element) return;

    dragRef.current.active = true;
    dragRef.current.startX = event.clientX;
    dragRef.current.startScrollLeft = element.scrollLeft;
    dragRef.current.moved = false;
    setDragging(true);
  };

  const stopDrag = () => {
    if (!dragRef.current.active) return;
    if (dragRef.current.moved) {
      suppressClickUntilRef.current = Date.now() + 200;
    }
    dragRef.current.active = false;
    dragRef.current.moved = false;
    setDragging(false);
  };

  useEffect(() => {
    if (!dragging) return;

    const moveDrag = (event: MouseEvent) => {
      if (!dragRef.current.active) return;
      const element = rowRef.current;
      if (!element) return;

      const deltaX = event.clientX - dragRef.current.startX;
      if (!dragRef.current.moved && Math.abs(deltaX) < DRAG_THRESHOLD) {
        return;
      }

      dragRef.current.moved = true;
      element.scrollLeft = dragRef.current.startScrollLeft - deltaX;
      event.preventDefault();
    };

    const stopDragFromWindow = () => {
      stopDrag();
    };

    window.addEventListener("mousemove", moveDrag, { passive: false });
    window.addEventListener("mouseup", stopDragFromWindow);
    window.addEventListener("blur", stopDragFromWindow);

    return () => {
      window.removeEventListener("mousemove", moveDrag);
      window.removeEventListener("mouseup", stopDragFromWindow);
      window.removeEventListener("blur", stopDragFromWindow);
    };
  }, [dragging]);

  const handleMouseLeave = () => {
    const element = rowRef.current;
    if (!element) return;
    if (!dragRef.current.active) return;
    if (!element.matches(":hover")) {
      stopDrag();
    }
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
      onMouseDown={startDrag}
      onMouseLeave={handleMouseLeave}
      onMouseUp={stopDrag}
      onClickCapture={handleClickCapture}
      onWheel={handleWheel}
      onDragStart={(event) => event.preventDefault()}
      className={`${className} ${dragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
    >
      {children}
    </div>
  );
}
