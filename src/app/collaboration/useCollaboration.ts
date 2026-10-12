import { useEffect, useRef, useState, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import {
  type Collaborator,
  type CursorPosition,
  type DocChangePayload,
  type EditorialComment,
  type NewsroomMessage,
  getAestheticColor,
} from "./types";

interface UseCollaborationOptions {
  issueId: string;
  user: { id?: string; email?: string; user_metadata?: { full_name?: string } } | null;
  onRemoteChange?: (payload: DocChangePayload) => void;
  onRequestState?: () => any; // Return current document state to supply to new peers
  onCommentChange?: (comments: EditorialComment[]) => void;
  onChatMessage?: (message: NewsroomMessage) => void;
}

export function useCollaboration({
  issueId,
  user,
  onRemoteChange,
  onRequestState,
  onCommentChange,
  onChatMessage,
}: UseCollaborationOptions) {
  // Generate unique client ID per tab/device so multi-window / multi-device sessions never self-filter
  const sessionClientId = useRef(
    `${user?.id ? user.id.slice(0, 8) : "guest"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  );
  const userIdentifier = user?.email ?? user?.user_metadata?.full_name ?? sessionClientId.current;
  const userName = user?.user_metadata?.full_name ?? (user?.email ? user.email.split("@")[0] : "Collaborator");
  const userEmail = user?.email ?? "";
  const userColor = getAestheticColor(userIdentifier);

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastCursorBroadcastRef = useRef<number>(0);
  const onRequestStateRef = useRef(onRequestState);
  onRequestStateRef.current = onRequestState;

  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;

  const onCommentChangeRef = useRef(onCommentChange);
  onCommentChangeRef.current = onCommentChange;

  const onChatMessageRef = useRef(onChatMessage);
  onChatMessageRef.current = onChatMessage;

  // Initialize Supabase Realtime channel
  useEffect(() => {
    if (!issueId) return;

    const channelName = `issue-collab:${issueId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: sessionClientId.current },
        broadcast: { ack: false, self: false },
      },
    });

    channelRef.current = channel;

    // 1. Presence synchronization
    channel.on("presence", { event: "sync" }, () => {
      const presenceState = channel.presenceState();
      const list: Collaborator[] = [];

      Object.entries(presenceState).forEach(([key, entries]) => {
        const raw = entries?.[0] as any;
        if (raw) {
          list.push({
            id: key,
            name: raw.name ?? "Collaborator",
            email: raw.email ?? "",
            color: raw.color ?? getAestheticColor(key),
            joinedAt: raw.joinedAt ?? Date.now(),
          });
        }
      });

      setCollaborators(list);
    });

    // 2. Broadcast listener for other collaborators' cursors
    channel.on("broadcast", { event: "cursor" }, ({ payload }) => {
      if (!payload || payload.id === sessionClientId.current) return;
      setCursors((prev) => ({
        ...prev,
        [payload.id]: {
          id: payload.id,
          name: payload.name,
          color: payload.color,
          xPercent: payload.xPercent,
          yPercent: payload.yPercent,
          lastMoved: Date.now(),
        },
      }));
    });

    // 3. Broadcast listener for document state changes
    channel.on("broadcast", { event: "doc_change" }, ({ payload }) => {
      if (!payload || payload.senderId === sessionClientId.current) return;
      if (onRemoteChangeRef.current) {
        onRemoteChangeRef.current(payload as DocChangePayload);
      }
    });

    // 4. Broadcast listener for editorial comments
    channel.on("broadcast", { event: "comments_sync" }, ({ payload }) => {
      if (!payload || payload.senderId === sessionClientId.current) return;
      if (onCommentChangeRef.current && Array.isArray(payload.comments)) {
        onCommentChangeRef.current(payload.comments);
      }
    });

    // 5. Broadcast listener for newsroom chat messages
    channel.on("broadcast", { event: "chat_message" }, ({ payload }) => {
      if (!payload || payload.senderId === sessionClientId.current) return;
      if (onChatMessageRef.current) {
        onChatMessageRef.current(payload as NewsroomMessage);
      }
    });

    // 6. Peer state handshake: new peer asks for latest state
    channel.on("broadcast", { event: "request_state" }, ({ payload }) => {
      if (payload?.requesterId === sessionClientId.current) return;
      if (onRequestStateRef.current) {
        const state = onRequestStateRef.current();
        if (state && channel.state === "joined") {
          channel.send({
            type: "broadcast",
            event: "response_state",
            payload: {
              targetId: payload.requesterId,
              state,
              senderId: sessionClientId.current,
            },
          });
        }
      }
    });

    // 7. Peer state handshake response
    channel.on("broadcast", { event: "response_state" }, ({ payload }) => {
      if (payload?.targetId !== sessionClientId.current) return;
      if (payload.state && onRemoteChangeRef.current) {
        onRemoteChangeRef.current({
          type: "full",
          data: payload.state,
          senderId: payload.senderId,
          senderName: "Peer",
          timestamp: Date.now(),
        });
      }
      if (payload.state?.comments && onCommentChangeRef.current && Array.isArray(payload.state.comments)) {
        onCommentChangeRef.current(payload.state.comments);
      }
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        await channel.track({
          id: sessionClientId.current,
          name: userName,
          email: userEmail,
          color: userColor,
          joinedAt: Date.now(),
        });

        // Request initial state from any active peer
        if (channel.state === "joined") {
          channel.send({
            type: "broadcast",
            event: "request_state",
            payload: { requesterId: sessionClientId.current },
          });
        }
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        setIsConnected(false);
      }
    });

    // Periodic cleanup of idle cursors (older than 3.5s)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        let hasExpired = false;
        const next: Record<string, CursorPosition> = {};
        Object.entries(prev).forEach(([id, cursor]) => {
          if (now - cursor.lastMoved < 3500) {
            next[id] = cursor;
          } else {
            hasExpired = true;
          }
        });
        return hasExpired ? next : prev;
      });
    }, 1000);

    return () => {
      clearInterval(cleanupInterval);
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [issueId, userName, userEmail, userColor]);

  // Broadcast mouse position across the canvas (throttled to ~35ms)
  const broadcastCursor = useCallback(
    (xPercent: number, yPercent: number) => {
      const now = Date.now();
      if (now - lastCursorBroadcastRef.current < 35) return;
      lastCursorBroadcastRef.current = now;

      if (!channelRef.current || !isConnected || channelRef.current.state !== "joined") return;

      channelRef.current.send({
        type: "broadcast",
        event: "cursor",
        payload: {
          id: sessionClientId.current,
          name: userName,
          email: userEmail,
          color: userColor,
          xPercent,
          yPercent,
        },
      });
    },
    [isConnected, userName, userEmail, userColor],
  );

  // Broadcast layout or content changes to all connected peers
  const broadcastDocChange = useCallback(
    (type: DocChangePayload["type"], data: any) => {
      if (!channelRef.current || !isConnected || channelRef.current.state !== "joined") return;
      channelRef.current.send({
        type: "broadcast",
        event: "doc_change",
        payload: {
          type,
          data,
          senderId: sessionClientId.current,
          senderName: userName,
          timestamp: Date.now(),
        },
      });
    },
    [isConnected, userName],
  );

  // Broadcast updated comment threads
  const broadcastComments = useCallback(
    (comments: EditorialComment[]) => {
      if (!channelRef.current || !isConnected || channelRef.current.state !== "joined") return;
      channelRef.current.send({
        type: "broadcast",
        event: "comments_sync",
        payload: {
          comments,
          senderId: sessionClientId.current,
        },
      });
    },
    [isConnected],
  );

  // Send newsroom chat message to peers
  const sendChatMessage = useCallback(
    (text: string): NewsroomMessage | null => {
      if (!text.trim() || !channelRef.current || !isConnected || channelRef.current.state !== "joined") return null;
      const message: NewsroomMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        senderId: sessionClientId.current,
        senderName: userName,
        senderColor: userColor,
        text: text.trim(),
        timestamp: Date.now(),
      };
      channelRef.current.send({
        type: "broadcast",
        event: "chat_message",
        payload: message,
      });
      return message;
    },
    [isConnected, userName, userColor],
  );

  return {
    collaborators,
    cursors,
    broadcastCursor,
    broadcastDocChange,
    broadcastComments,
    sendChatMessage,
    isConnected,
    userColor,
    userName,
    userEmail,
    myId: sessionClientId.current,
  };
}
