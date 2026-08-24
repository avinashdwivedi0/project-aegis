import {
  useCallback,
  useRef,
  useState,
} from "react";

import axios from "axios";
import { toast } from "sonner";

import {
  sendChatMessage,
} from "@/services/chat";

import type {
  ChatMessage,
} from "@/types/chat";

const createId = () =>
  crypto.randomUUID();

const timestamp = () =>
  new Date().toISOString();

export function useChat(
  repositoryId: string
) {
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [loading, setLoading] =
    useState(false);

  const controllerRef =
    useRef<AbortController | null>(
      null
    );

  const stop =
    useCallback(() => {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setLoading(false);
    }, []);

  const clearMessages =
    useCallback(() => {
      stop();
      setMessages([]);
    }, [stop]);

  const sendMessage =
    useCallback(
      async (
        content: string
      ) => {
        const message =
          content.trim();

        if (
          !repositoryId ||
          !message ||
          loading
        ) {
          return false;
        }

        const controller =
          new AbortController();

        controllerRef.current =
          controller;

        const userId =
          createId();

        const assistantId =
          createId();

        setMessages(
          (current) => [
            ...current,
            {
              id: userId,
              role: "user",
              content: message,
              createdAt:
                timestamp(),
              status:
                "completed",
              sources: [],
            },
            {
              id: assistantId,
              role:
                "assistant",
              content: "",
              createdAt:
                timestamp(),
              status:
                "pending",
              sources: [],
            },
          ]
        );

        setLoading(true);

        try {
          const response =
            await sendChatMessage({
              repositoryId,
              message,
              signal:
                controller.signal,
            });

          setMessages(
            (current) =>
              current.map(
                (item) =>
                  item.id ===
                  assistantId
                    ? {
                        ...item,
                        content:
                          response
                            .data
                            .answer,
                        status:
                          "completed",
                        sources:
                          response
                            .data
                            .sources,
                      }
                    : item
              )
          );

          return true;
        } catch (error) {
          if (
            controller.signal
              .aborted
          ) {
            setMessages(
              (current) =>
                current.filter(
                  (item) =>
                    item.id !==
                    assistantId
                )
            );

            return false;
          }

          console.error(
            error
          );

          setMessages(
            (current) =>
              current.map(
                (item) =>
                  item.id ===
                  assistantId
                    ? {
                        ...item,
                        content:
                          "I couldn't generate a response. Please try again.",
                        status:
                          "failed",
                      }
                    : item
              )
          );

          const errorMessage =
            axios.isAxiosError(error) &&
            typeof error.response?.data?.message ===
              "string"
              ? error.response.data.message
              : "Failed to generate AI response.";

          toast.error(errorMessage);

          return false;
        } finally {
          controllerRef.current =
            null;
          setLoading(false);
        }
      },
      [
        repositoryId,
        loading,
      ]
    );

  return {
    messages,
    loading,
    hasMessages:
      messages.length > 0,
    sendMessage,
    clearMessages,
    stop,
  };
}