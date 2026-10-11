import React from "react";
import { type Collaborator, getInitials } from "./types";

interface CollaboratorAvatarsProps {
  collaborators: Collaborator[];
  isConnected: boolean;
  myId?: string;
  myColor?: string;
}

export default function CollaboratorAvatars({
  collaborators,
  isConnected,
  myId,
  myColor,
}: CollaboratorAvatarsProps) {
  // Sort with current user first or most recent
  const sorted = [...collaborators].sort((a, b) => (a.id === myId ? -1 : 1));
  const visible = sorted.slice(0, 4);
  const extraCount = Math.max(0, sorted.length - 4);

  return (
    <div className="flex items-center gap-2">
      {/* Live status badge */}
      <div className="hidden items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-black/70 sm:flex">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isConnected ? "bg-emerald-500 animate-pulse" : "bg-black/30"
          }`}
        />
        <span>{collaborators.length > 1 ? `${collaborators.length} Live` : "Live"}</span>
      </div>

      {/* Avatar stack */}
      <div className="flex -space-x-1.5 overflow-hidden">
        {visible.map((collab) => {
          const isMe = collab.id === myId;
          const initials = getInitials(collab.name || collab.email);
          return (
            <div
              className="group relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f4f1e9] text-[9px] font-bold text-white shadow-sm transition-transform hover:z-20 hover:scale-110"
              key={collab.id}
              style={{ backgroundColor: collab.color }}
              title={`${collab.name}${isMe ? " (You)" : ""}${collab.email ? ` · ${collab.email}` : ""}`}
            >
              <span>{initials}</span>

              {/* Floating Tooltip */}
              <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#171714] px-2 py-0.5 text-[8px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {collab.name} {isMe && "(You)"}
              </div>
            </div>
          );
        })}

        {extraCount > 0 && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f4f1e9] bg-[#171714] text-[8px] font-bold text-white shadow-sm"
            title={`${extraCount} more collaborator${extraCount > 1 ? "s" : ""}`}
          >
            +{extraCount}
          </div>
        )}
      </div>
    </div>
  );
}
