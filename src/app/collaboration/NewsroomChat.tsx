import React, { useState, useEffect, useRef } from "react";
import type { NewsroomMessage } from "./types";

interface NewsroomChatProps {
  messages: NewsroomMessage[];
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export default function NewsroomChat({
  messages,
  onSendMessage,
  isOpen,
  onClose,
  currentUserId,
}: NewsroomChatProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <aside
      aria-label="Newsroom Chat"
      className="editor-only fixed bottom-0 right-0 top-16 z-40 flex w-80 max-w-[90vw] flex-col border-l border-black/15 bg-[#171714] text-white shadow-2xl transition-transform"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h3 className="font-serif text-lg font-semibold italic text-white">
            Newsroom Live Chat
          </h3>
          <p className="text-[8px] uppercase tracking-[0.16em] text-white/40">
            Real-time peer discussion
          </p>
        </div>
        <button
          aria-label="Close chat"
          className="grid h-7 w-7 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="py-16 text-center text-xs text-white/35">
            No messages yet. Say hi to fellow editors!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                key={msg.id}
              >
                <div className="flex items-center gap-1.5 text-[9px] text-white/40">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: msg.senderColor }}
                  />
                  <span>{isMe ? "You" : msg.senderName}</span>
                  <span>·</span>
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className={`mt-1 max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    isMe
                      ? "rounded-tr-none bg-[#ef5a35] text-white"
                      : "rounded-tl-none bg-white/10 text-white/90"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <form
        className="border-t border-white/10 bg-[#171714] p-3"
        onSubmit={handleSubmit}
      >
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#ef5a35]"
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message to peers…"
            value={inputText}
          />
          <button
            className="rounded-md bg-[#ef5a35] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white hover:bg-white hover:text-black disabled:opacity-40"
            disabled={!inputText.trim()}
            type="submit"
          >
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}
