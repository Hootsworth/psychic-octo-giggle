import React, { useState } from "react";
import type { EditorialComment } from "./types";

interface CommentsPanelProps {
  comments: EditorialComment[];
  onAddComment: (text: string) => void;
  onToggleResolve: (id: string) => void;
  onDeleteComment: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function CommentsPanel({
  comments,
  onAddComment,
  onToggleResolve,
  onDeleteComment,
  isOpen,
  onClose,
}: CommentsPanelProps) {
  const [newCommentText, setNewCommentText] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");

  if (!isOpen) return null;

  const filteredComments = comments.filter((c) => {
    if (filter === "open") return !c.resolved;
    if (filter === "resolved") return c.resolved;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(newCommentText.trim());
    setNewCommentText("");
  };

  return (
    <aside
      aria-label="Editorial Comments"
      className="editor-only fixed bottom-0 right-0 top-16 z-40 flex w-80 max-w-[90vw] flex-col border-l border-black/15 bg-[#f8f5ed] text-[#171714] shadow-2xl transition-transform"
    >
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
        <div>
          <h3 className="font-serif text-lg font-semibold">Editorial Notes</h3>
          <p className="text-[8px] uppercase tracking-[0.16em] text-black/45">
            {comments.filter((c) => !c.resolved).length} unresolved notes
          </p>
        </div>
        <button
          aria-label="Close notes"
          className="grid h-7 w-7 place-items-center rounded-full text-black/40 hover:bg-black/5 hover:text-black"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-black/10 px-4 py-2 text-[8px] font-bold uppercase tracking-[0.12em]">
        <button
          className={`flex-1 rounded py-1.5 text-center ${filter === "open" ? "bg-black text-white" : "text-black/50 hover:text-black"}`}
          onClick={() => setFilter("open")}
          type="button"
        >
          Open ({comments.filter((c) => !c.resolved).length})
        </button>
        <button
          className={`flex-1 rounded py-1.5 text-center ${filter === "resolved" ? "bg-black text-white" : "text-black/50 hover:text-black"}`}
          onClick={() => setFilter("resolved")}
          type="button"
        >
          Resolved ({comments.filter((c) => c.resolved).length})
        </button>
        <button
          className={`flex-1 rounded py-1.5 text-center ${filter === "all" ? "bg-black text-white" : "text-black/50 hover:text-black"}`}
          onClick={() => setFilter("all")}
          type="button"
        >
          All ({comments.length})
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {filteredComments.length === 0 ? (
          <div className="py-12 text-center text-xs text-black/40">
            {filter === "open"
              ? "No open editorial comments. Good job!"
              : "No comments found."}
          </div>
        ) : (
          filteredComments.map((comment) => (
            <div
              className={`rounded-lg border p-3 text-xs transition ${comment.resolved ? "border-black/5 bg-black/[0.02] opacity-60" : "border-black/10 bg-white shadow-xs"}`}
              key={comment.id}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: comment.authorColor }}
                  />
                  <span className="font-semibold text-[11px] text-[#171714]">
                    {comment.authorName}
                  </span>
                </div>
                <span className="text-[8px] text-black/40">
                  {new Date(comment.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[#171714]">
                {comment.text}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2 text-[8px] uppercase tracking-[0.1em]">
                <button
                  className="font-bold text-[#ef5a35] hover:underline"
                  onClick={() => onToggleResolve(comment.id)}
                  type="button"
                >
                  {comment.resolved ? "Reopen" : "✓ Mark Resolved"}
                </button>
                <button
                  className="text-black/35 hover:text-red-600"
                  onClick={() => onDeleteComment(comment.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Comment Input */}
      <form className="border-t border-black/10 bg-white p-3" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-black/15 bg-[#f8f5ed] px-3 py-2 text-xs outline-none focus:border-[#ef5a35]"
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Add an editorial note…"
            value={newCommentText}
          />
          <button
            className="rounded-md bg-[#171714] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#ef5a35] disabled:opacity-40"
            disabled={!newCommentText.trim()}
            type="submit"
          >
            Post
          </button>
        </div>
      </form>
    </aside>
  );
}
