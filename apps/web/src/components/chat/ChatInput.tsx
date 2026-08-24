import {
  Loader2,
  Send,
  Square,
} from "lucide-react";

import {
  useState,
} from "react";

import type {
  KeyboardEvent,
} from "react";
type Props = {
  loading: boolean;
  disabled?: boolean;
  onSend: (
    message: string,
  ) => Promise<boolean> | boolean;
  onStop?: () => void;
};

export default function ChatInput({
  loading,
  disabled = false,
  onSend,
  onStop,
}: Props) {
  const [message, setMessage] =
    useState("");

  async function submit() {
    const value = message.trim();

    if (!value || loading) {
      return;
    }

    const success =
      await onSend(value);

    if (success) {
      setMessage("");
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-end gap-3">
        <textarea
          rows={1}
          value={message}
          disabled={loading || disabled}
          placeholder="Ask anything about this repository..."
          onChange={(event) =>
            setMessage(
              event.target.value,
            )
          }
          onKeyDown={
            handleKeyDown
          }
          className="min-h-12 max-h-40 flex-1 resize-none rounded-lg border bg-background px-4 py-3 outline-none focus:ring-2"
        />

        {loading ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-12 w-12 items-center justify-center rounded-lg border"
          >
            <Square
              className="h-5 w-5"
            />
          </button>
        ) : (
          <button
            type="button"
            disabled={
              disabled || !message.trim()
            }
            onClick={() =>
              void submit()
            }
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send
              className="h-5 w-5"
            />
          </button>
        )}
      </div>

      {loading && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          AI is generating a response...
        </div>
      )}
    </div>
  );
}