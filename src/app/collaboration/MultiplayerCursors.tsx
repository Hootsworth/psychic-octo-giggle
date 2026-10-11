import React from "react";
import type { CursorPosition } from "./types";

interface MultiplayerCursorsProps {
  cursors: Record<string, CursorPosition>;
  pageIndex: number;
}

export default function MultiplayerCursors({
  cursors,
  pageIndex,
}: MultiplayerCursorsProps) {
  const activeCursors = Object.values(cursors).filter(
    (c) => c.pageIndex === pageIndex,
  );

  if (!activeCursors.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {activeCursors.map((cursor) => (
        <div
          className="absolute left-0 top-0 transition-transform duration-75 ease-out will-change-transform"
          key={cursor.id}
          style={{
            transform: `translate3d(${cursor.xPercent}%, ${cursor.yPercent}%, 0)`,
          }}
        >
          {/* Aesthetic SVG Cursor Arrow with drop shadow */}
          <svg
            className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
            fill="none"
            height="24"
            viewBox="0 0 24 24"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
              fill={cursor.color}
              stroke="#ffffff"
              strokeWidth="1.2"
            />
          </svg>

          {/* Floating Aesthetic Name Tag */}
          <div
            className="-mt-1 ml-4 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
            style={{
              backgroundColor: cursor.color,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white opacity-80 animate-pulse" />
            <span className="max-w-[120px] truncate">{cursor.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
