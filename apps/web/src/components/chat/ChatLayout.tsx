import type {
  ChatMessage,
} from "@/types/chat";

import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatMessageList from "./ChatMessageList";

type ChatLayoutProps = {
  repositoryName?: string;
  messages: ChatMessage[];
  loading: boolean;
  disabled?: boolean;

  onSend: (
    message: string
  ) => Promise<boolean>;

  onClear: () => void;
};

function ChatLayout({
  repositoryName,
  messages,
  loading,
  disabled = false,
  onSend,
  onClear,
}: ChatLayoutProps) {
  return (
    <section className="flex h-[calc(100vh-8rem)] min-h-150 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/10">
      <ChatHeader
        repositoryName={
          repositoryName
        }
        messageCount={
          messages.length
        }
        hasMessages={
          messages.length > 0
        }
        onClear={onClear}
      />

      <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
        <ChatMessageList
          messages={messages}
          loading={loading}
          disabled={disabled}
          onPromptSelect={(
            prompt
          ) => {
            void onSend(prompt);
          }}
        />
      </div>

      <ChatInput
        loading={loading}
        disabled={disabled}
        onSend={onSend}
      />
    </section>
  );
}

export default ChatLayout;