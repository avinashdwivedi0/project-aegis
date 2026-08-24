import {
  AlertCircle,
  Bot,
  Check,
  Copy,
  FileText,
  User,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import type {
  ChatMessage,
} from "@/types/chat";

type ChatBubbleProps = {
  message: ChatMessage;
};

function formatMessageTime(
  timestamp: string,
) {
  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(timestamp));
}

function ChatBubble({
  message,
}: ChatBubbleProps) {
  const [copied, setCopied] =
    useState(false);

  const isUser =
    message.role === "user";

  const isFailed =
    message.status === "failed";

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId =
      window.setTimeout(() => {
        setCopied(false);
      }, 2000);

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        message.content,
      );

      setCopied(true);
    } catch (error) {
      console.error(
        "Unable to copy chat message.",
        error,
      );
    }
  }

  return (
    <article
      className={`group flex items-end gap-3 ${
        isUser
          ? "justify-end"
          : "justify-start"
      }`}
    >
      {!isUser && (
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
            isFailed
              ? "border-red-500/20 bg-red-500/10 text-red-400"
              : "border-cyan-500/20 bg-cyan-500/10 text-cyan-400"
          }`}
        >
          {isFailed ? (
            <AlertCircle
              size={18}
            />
          ) : (
            <Bot size={18} />
          )}
        </div>
      )}

      <div
        className={`flex max-w-[85%] flex-col gap-2 sm:max-w-[75%] ${
          isUser
            ? "items-end"
            : "items-start"
        }`}
      >
        <div
          className={`relative rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? "rounded-br-md bg-cyan-600 text-white"
              : isFailed
                ? "rounded-bl-md border border-red-500/20 bg-red-500/10 text-red-200"
                : "rounded-bl-md border border-slate-800 bg-slate-900 text-slate-200"
          }`}
        >
          <p className="wrap-break-words whitespace-pre-wrap text-sm leading-6">
            {message.content}
          </p>

          {!isUser &&
            !isFailed && (
              <button
                type="button"
                onClick={() =>
                  void handleCopy()
                }
                className="absolute -right-10 top-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 opacity-0 transition hover:bg-slate-800 hover:text-slate-200 group-hover:opacity-100"
              >
                {copied ? (
                  <Check
                    size={15}
                    className="text-emerald-400"
                  />
                ) : (
                  <Copy size={15} />
                )}
              </button>
            )}
        </div>

        {!isUser &&
          message.sources.length >
            0 && (
            <div className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Sources
              </div>

              <div className="space-y-2">
                {message.sources.map(
                  (
                    source,
                    index,
                  ) => (
                    <div
                      key={`${source.filePath}-${source.chunkIndex}-${index}`}
                      className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900 p-2"
                    >
                      <FileText
                        size={15}
                        className="mt-0.5 shrink-0 text-cyan-400"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-200">
                          {
                            source.filePath
                          }
                        </p>

                        <p className="text-[11px] text-slate-500">
                          Chunk{" "}
                          {
                            source.chunkIndex
                          }{" "}
                          •{" "}
                          {(
                            source.score *
                            100
                          ).toFixed(
                            1,
                          )}
                          %
                          match
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

        <div
          className={`flex items-center gap-1.5 px-1 text-[11px] text-slate-600 ${
            isUser
              ? "flex-row-reverse"
              : ""
          }`}
        >
          {isUser ? (
            <User size={12} />
          ) : (
            <Bot size={12} />
          )}

          <time
            dateTime={
              message.createdAt
            }
          >
            {formatMessageTime(
              message.createdAt,
            )}
          </time>

          {isFailed && (
            <span className="text-red-400">
              · Failed
            </span>
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
          <User size={18} />
        </div>
      )}
    </article>
  );
}

export default ChatBubble;