import {
  useEffect,
  useRef,
} from "react";

import ChatBubble from "./ChatBubble";
import EmptyChat from "./EmptyChat";
import TypingIndicator from "./TypingIndicator";

import type {
  ChatMessage,
} from "@/types/chat";

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  disabled?: boolean;
  onPromptSelect: (
    prompt: string,
  ) => void;
};

export default function ChatMessageList({
  messages,
  loading,
  disabled = false,
  onPromptSelect,
}: Props) {
  const bottomRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  if (
    messages.length === 0 &&
    !loading
  ) {
    return (
      <EmptyChat
        disabled={disabled}
        onPromptSelect={
          onPromptSelect
        }
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
      {messages.map((message) => (
        <ChatBubble
          key={message.id}
          message={message}
        />
      ))}

      {loading && (
        <TypingIndicator />
      )}

      <div ref={bottomRef} />
    </div>
  );
}