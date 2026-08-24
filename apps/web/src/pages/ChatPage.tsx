import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import ChatLayout from "@/components/chat/ChatLayout";

import { useChat } from "@/hooks/useChat";

import { getRepository } from "@/services/repository";

import type { Repository } from "@/types/repository";

function ChatPage() {
  const {
    projectId,
    repositoryId,
  } = useParams<{
    projectId: string;
    repositoryId: string;
  }>();

  const [
    repository,
    setRepository,
  ] = useState<Repository | null>(
    null
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const safeRepositoryId =
    repositoryId ?? "";

  const {
    messages,
    loading: chatLoading,
    hasMessages,
    sendMessage,
    clearMessages,
  } = useChat(safeRepositoryId);

  const loadRepository =
    useCallback(async () => {
      if (!safeRepositoryId) {
        setRepository(null);
        setError(
          "Repository ID is missing."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response =
          await getRepository(
            safeRepositoryId
          );

        setRepository(
          response.data
        );
      } catch (err) {
        console.error(
          "Failed to load repository.",
          err
        );

        setRepository(null);

        setError(
          "Unable to load this repository."
        );
      } finally {
        setLoading(false);
      }
    }, [safeRepositoryId]);

  useEffect(() => {
    void Promise.resolve().then(
      loadRepository
    );
  }, [loadRepository]);

  const repositoryPath =
    projectId &&
    repositoryId
      ? `/projects/${projectId}/repositories/${repositoryId}`
      : "/projects";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2
            size={34}
            className="animate-spin text-cyan-400"
          />

          <p className="text-sm">
            Loading repository
            chat...
          </p>
        </div>
      </div>
    );
  }

  if (
    error ||
    !repository
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <AlertTriangle
              size={28}
            />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-slate-100">
            Repository unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {error ??
              "The requested repository could not be found."}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                void loadRepository()
              }
              className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-500"
            >
              Try again
            </button>

            <Link
              to="/projects"
              className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              Back to projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isIndexed =
    repository.status ===
    "INDEXED";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to={repositoryPath}
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-cyan-400"
        >
          <ArrowLeft size={17} />
          Back to repository
        </Link>

        {!isIndexed && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            <AlertTriangle
              size={15}
            />
            Repository must be
            indexed before using
            AI chat.
          </div>
        )}
      </div>

      <ChatLayout
        repositoryName={
          repository.name
        }
        messages={messages}
        loading={chatLoading}
        disabled={!isIndexed}
        onSend={sendMessage}
        onClear={
          clearMessages
        }
      />

      {hasMessages && (
        <p className="text-center text-xs text-slate-600">
          This conversation is
          currently stored only
          in browser memory and
          will reset when the
          page is refreshed.
        </p>
      )}
    </div>
  );
}

export default ChatPage;