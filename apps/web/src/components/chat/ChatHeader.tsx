import {
  Bot,
  MessageSquareText,
  Trash2,
} from "lucide-react";

type ChatHeaderProps = {
  repositoryName?: string;
  messageCount: number;
  hasMessages: boolean;
  onClear: () => void;
};

function ChatHeader({
  repositoryName,
  messageCount,
  hasMessages,
  onClear,
}: ChatHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-800 bg-slate-950/80 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
          <Bot size={22} />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-slate-100">
              Aegis AI
            </h1>

            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
              Ready
            </span>
          </div>

          <p className="mt-0.5 truncate text-sm text-slate-400">
            {repositoryName
              ? `Chat with ${repositoryName}`
              : "Ask questions about this repository"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MessageSquareText size={15} />

          <span>
            {messageCount}{" "}
            {messageCount === 1
              ? "message"
              : "messages"}
          </span>
        </div>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasMessages}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:bg-slate-900 disabled:hover:text-slate-300"
        >
          <Trash2 size={16} />

          Clear chat
        </button>
      </div>
    </header>
  );
}

export default ChatHeader;