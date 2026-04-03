"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { Theme } from "emoji-picker-react";

const EmojiPicker = dynamic(
  () => import("emoji-picker-react"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] w-[min(100vw-2rem,20rem)] items-center justify-center rounded-xl bg-stone-100 text-sm text-stone-500 dark:bg-stone-800 dark:text-stone-400">
        Loading emojis…
      </div>
    ),
  }
);

export function ChatEmojiPicker({
  onEmojiSelect,
}: {
  onEmojiSelect: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function closeOnEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function onEmojiClick(emojiData: EmojiClickData) {
    onEmojiSelect(emojiData.emoji);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="flex h-[42px] w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-xl leading-none text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300 dark:hover:bg-stone-800"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? "Close emoji picker" : "Open emoji picker"}
      >
        🙂
      </button>

      {open && (
        <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 max-w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-600 dark:bg-stone-900 dark:shadow-black/40">
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme={Theme.AUTO}
            width="min(calc(100vw - 2rem), 22rem)"
            height={360}
            lazyLoadEmojis
            searchPlaceHolder="Search emoji"
            previewConfig={{ showPreview: true }}
          />
        </div>
      )}
    </div>
  );
}
