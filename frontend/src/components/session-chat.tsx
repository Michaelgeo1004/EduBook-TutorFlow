"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/config";
import { ChatEmojiPicker } from "@/components/chat-emoji-picker";
import { UiCard } from "@/components/ui-card";

type Message = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender?: { full_name?: string; email?: string };
};

type PresenceUser = { userId: string; email: string };

function formatChatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function shortName(email: string) {
  const local = email.split("@")[0] || email;
  return local.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function normId(id: string | null | undefined) {
  return (id ?? "").toString().trim().toLowerCase();
}

/** Strict ordering so same-clock messages don’t flip read state incorrectly. */
function peerMessageStrictlyAfter(own: Message, peerMsg: Message) {
  const o = new Date(own.created_at).getTime();
  const p = new Date(peerMsg.created_at).getTime();
  if (p > o) return true;
  if (p < o) return false;
  return peerMsg.id > own.id;
}

function latestMessageTimestamp(msgs: Message[]) {
  if (msgs.length === 0) return null;
  let best = msgs[0];
  for (const m of msgs) {
    const t = new Date(m.created_at).getTime();
    const bt = new Date(best.created_at).getTime();
    if (t > bt || (t === bt && m.id > best.id)) best = m;
  }
  return best.created_at;
}

/** One checkmark only — the common “double tick” asset path draws TWO checks; duplicating it caused four ticks. */
const tickSinglePath =
  "M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512";

/** Sent / delivered / read behavior (like WhatsApp), without copying their visual theme. */
function MessageTicks({
  delivered,
  read,
  onDarkBubble,
}: {
  delivered: boolean;
  read: boolean;
  onDarkBubble?: boolean;
}) {
  const showDouble = delivered || read;
  const title = read ? "Read" : delivered ? "Delivered" : "Sent";

  const color = onDarkBubble
    ? read
      ? "text-sky-300"
      : delivered
        ? "text-white/75"
        : "text-white/50"
    : read
      ? "text-sky-600 dark:text-sky-400"
      : "text-stone-400 dark:text-stone-500";

  return (
    <span
      className={`relative inline-block h-3.5 w-[18px] shrink-0 ${color}`}
      title={title}
      aria-hidden
    >
      <svg
        viewBox="0 0 16 15"
        className="absolute left-0 top-0 h-3.5 w-3.5"
        fill="currentColor"
      >
        <path d={tickSinglePath} />
      </svg>
      {showDouble && (
        <svg
          viewBox="0 0 16 15"
          className="absolute left-[5px] top-0 h-3.5 w-3.5"
          fill="currentColor"
        >
          <path d={tickSinglePath} />
        </svg>
      )}
    </span>
  );
}

function TypingDots() {
  return (
    <div
      className="inline-flex items-center gap-1 px-1 py-0.5"
      aria-label="Typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="wa-typing-dot h-2 w-2 rounded-full bg-stone-400 dark:bg-stone-500"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

export function SessionChat({
  sessionId,
  token,
  currentUserId,
  partnerUserId,
  partnerName,
}: {
  sessionId: string;
  token: string | null;
  currentUserId: string;
  partnerUserId?: string | null;
  partnerName?: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerReadThrough, setPeerReadThrough] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const partnerUserIdRef = useRef(partnerUserId);
  const currentUserIdRef = useRef(currentUserId);
  partnerUserIdRef.current = partnerUserId;
  currentUserIdRef.current = currentUserId;
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmit = useRef(0);

  const pid = normId(partnerUserId);
  const cid = normId(currentUserId);
  const partnerInRoom =
    !!pid &&
    pid !== cid &&
    presence.some((p) => normId(p.userId) === pid);

  const headerTitle =
    partnerName?.trim() ||
    (partnerUserId ? "Session partner" : "Session chat");

  const subtitle =
    status !== "connected"
      ? status === "connecting"
        ? "Connecting…"
        : "Waiting for network…"
      : peerTyping
        ? "typing…"
        : partnerInRoom
          ? "online"
          : "offline";

  const lastOwnId = useMemo(() => {
    if (!cid) return null;
    const own = messages.filter((m) => normId(m.sender_id) === cid);
    return own.length ? own[own.length - 1].id : null;
  }, [messages, cid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerTyping]);

  useEffect(() => {
    if (!token) return;

    setStatus("connecting");
    const socket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      socket.emit("join_session", { session_id: sessionId });
    });

    socket.on("connect_error", () => setStatus("error"));

    function emitReadThrough(read_through: string) {
      socket.emit("chat_read", { session_id: sessionId, read_through });
    }

    socket.on("message_history", (p: { messages?: Message[] }) => {
      const list = p.messages || [];
      setMessages(list);
      const latest = latestMessageTimestamp(list);
      if (latest) emitReadThrough(latest);
    });

    socket.on("new_message", (p: { message: Message }) => {
      const incoming = p.message;
      setMessages((m) => [...m, incoming]);
      if (normId(incoming.sender_id) !== normId(currentUserIdRef.current)) {
        emitReadThrough(incoming.created_at);
      }
    });

    socket.on("presence", (p: { users?: PresenceUser[] }) => {
      setPresence(p.users || []);
    });

    socket.on(
      "peer_read_through",
      (payload: { userId?: string; read_through?: string }) => {
        const partner = normId(partnerUserIdRef.current);
        if (!partner || normId(payload.userId) !== partner) return;
        if (!payload.read_through) return;
        setPeerReadThrough((prev) => {
          if (!prev) return payload.read_through!;
          return new Date(payload.read_through!) >= new Date(prev)
            ? payload.read_through!
            : prev;
        });
      }
    );

    socket.on("user_typing", (p: { userId?: string }) => {
      if (!p.userId || normId(p.userId) === normId(currentUserId)) return;
      setPeerTyping(true);
      if (typingHideTimer.current) clearTimeout(typingHideTimer.current);
      typingHideTimer.current = setTimeout(() => setPeerTyping(false), 4000);
    });

    socket.on("user_stop_typing", (p: { userId?: string }) => {
      if (p.userId && normId(p.userId) !== normId(currentUserId)) {
        setPeerTyping(false);
      }
    });

    socket.on("error", (p: { message?: string }) => {
      console.warn("socket error event", p);
    });

    return () => {
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      if (typingHideTimer.current) clearTimeout(typingHideTimer.current);
      socket.emit("stop_typing", { session_id: sessionId });
      socket.close();
      socketRef.current = null;
      setPeerReadThrough(null);
    };
  }, [token, sessionId, currentUserId]);

  function pulseTyping() {
    const s = socketRef.current;
    if (!s?.connected) return;
    const now = Date.now();
    if (now - lastTypingEmit.current < 350) return;
    lastTypingEmit.current = now;
    s.emit("typing", { session_id: sessionId });
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      s.emit("stop_typing", { session_id: sessionId });
    }, 2000);
  }

  function onInputChange(v: string) {
    setInput(v);
    if (v.trim()) pulseTyping();
  }

  function send() {
    const s = input.trim();
    if (!s || !socketRef.current) return;
    socketRef.current.emit("stop_typing", { session_id: sessionId });
    socketRef.current.emit("send_message", {
      session_id: sessionId,
      content: s,
    });
    setInput("");
  }

  if (!token) {
    return (
      <UiCard padding="p-5">
        <p className="text-sm text-stone-500">Sign in to use session chat.</p>
      </UiCard>
    );
  }

  return (
    <UiCard className="flex flex-col overflow-hidden p-0" padding="p-0">
      <header className="flex items-center gap-3 border-b border-stone-100 bg-stone-50/80 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/80">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white shadow-sm">
          {(headerTitle.slice(0, 1) || "?").toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
            {headerTitle}
          </h3>
          <p
            className={`truncate text-xs ${
              peerTyping
                ? "italic text-teal-700 dark:text-teal-400"
                : "text-stone-500 dark:text-stone-400"
            }`}
          >
            {subtitle}
          </p>
        </div>
      </header>

      <div className="relative flex max-h-[min(480px,60vh)] min-h-[280px] flex-col bg-stone-100/60 dark:bg-stone-950/50">
        <div className="chat-scroll flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
          {messages.length === 0 && !peerTyping && (
            <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">
              No messages yet. Send a message to start.
            </p>
          )}

          {messages.map((msg, idx) => {
            const mine = normId(msg.sender_id) === cid;
            const prev = messages[idx - 1];
            const showMeta =
              !prev || normId(prev.sender_id) !== normId(msg.sender_id);
            const label =
              msg.sender?.full_name ||
              (msg.sender?.email ? shortName(msg.sender.email) : null) ||
              "Participant";

            const isLastOwn = !!lastOwnId && msg.id === lastOwnId;

            const replyRead =
              mine &&
              messages.some(
                (m) =>
                  normId(m.sender_id) !== cid &&
                  peerMessageStrictlyAfter(msg, m)
              );
            const receiptRead =
              mine &&
              !!peerReadThrough &&
              new Date(msg.created_at).getTime() <=
                new Date(peerReadThrough).getTime();
            const readBlue = replyRead || receiptRead;

            const delivered =
              mine && !readBlue && partnerInRoom && isLastOwn;

            return (
              <div
                key={msg.id}
                className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] ${
                    mine ? "items-end" : "items-start"
                  } flex flex-col gap-0.5`}
                >
                  {showMeta && !mine && (
                    <span className="pl-1 text-xs font-medium text-stone-500 dark:text-stone-400">
                      {label}
                    </span>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 shadow-sm ${
                      mine
                        ? "rounded-br-md bg-teal-600 text-white dark:bg-teal-700"
                        : "rounded-bl-md border border-stone-200/80 bg-white dark:border-stone-700 dark:bg-stone-900"
                    }`}
                  >
                    <p
                      className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
                        mine
                          ? "text-white"
                          : "text-stone-800 dark:text-stone-100"
                      }`}
                    >
                      {msg.content}
                    </p>
                    <div className="mt-1 flex items-end justify-end gap-1">
                      <time
                        className={`shrink-0 text-[11px] tabular-nums ${
                          mine
                            ? "text-white/70"
                            : "text-stone-500 dark:text-stone-400"
                        }`}
                        dateTime={msg.created_at}
                      >
                        {formatChatTime(msg.created_at)}
                      </time>
                      {mine && (
                        <MessageTicks
                          delivered={delivered}
                          read={readBlue}
                          onDarkBubble
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {peerTyping && (
            <div className="flex w-full justify-start">
              <div className="rounded-2xl rounded-bl-md border border-stone-200/80 bg-white px-4 py-2.5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} className="h-px shrink-0" />
        </div>

        <div className="border-t border-stone-100 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-end gap-2">
            <ChatEmojiPicker
              onEmojiSelect={(emoji) => setInput((v) => v + emoji)}
            />
            <input
              className="min-h-[42px] flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none ring-teal-600/20 placeholder:text-stone-400 focus:border-teal-500 focus:ring-4 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:focus:border-teal-500"
              placeholder="Message…"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              onBlur={() =>
                socketRef.current?.emit("stop_typing", {
                  session_id: sessionId,
                })
              }
            />
            <button
              type="button"
              onClick={send}
              className="shrink-0 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </UiCard>
  );
}
