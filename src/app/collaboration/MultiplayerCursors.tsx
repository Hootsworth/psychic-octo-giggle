import React from "react";
import type { CursorPosition } from "./types";

interface MultiplayerCursorsProps {
  cursors: Record<string, CursorPosition>;
}

export default function MultiplayerCursors({ cursors }: MultiplayerCursorsProps) {
  // Only display cursors that have valid document coordinates
  const activeCursors = Object.values(cursors).filter(
    (c) => c.xPercent >= 0 && c.xPercent <= 100 && c.yPercent >= 0 && c.yPercent <= 100,
  );

  if (!activeCursors.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-visible">
      {activeCursors.map((cursor) => (
        <div
          className="pointer-events-none absolute transition-[left,top] duration-75 ease-out will-change-[left,top]"
          key={cursor.id}
          style={{
            left: `${cursor.xPercent}%`,
            top: `${cursor.yPercent}%`,
          }}
        >
          {/* Aesthetic SVG Cursor Arrow with drop shadow */}
          <svg
            className="drop-shadow-[0_2px_5px_rgba(0,0,0,0.3)]"
            fill="none"
            height="26"
            viewBox="0 0 24 24"
            width="26"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
              fill={cursor.color}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>

          {/* Floating Aesthetic Name Tag */}
          <div
            className="-mt-1.5 ml-4 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-white shadow-[0_3px_10px_rgba(0,0,0,0.22)]"
            style={{
              backgroundColor: cursor.color,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white opacity-90 animate-pulse" />
            <span className="max-w-[140px] truncate">{cursor.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
