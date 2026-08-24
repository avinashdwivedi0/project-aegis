import {
  Bot,
  Braces,
  FileSearch,
  GitBranch,
  Sparkles,
} from "lucide-react";

type EmptyChatProps = {
  disabled?: boolean;
  onPromptSelect: (
    prompt: string
  ) => void;
};

const suggestedPrompts = [
  {
    icon: FileSearch,
    title: "Explain the architecture",
    prompt:
      "Explain the overall architecture of this repository and how its main modules work together.",
  },
  {
    icon: Braces,
    title: "Find important code",
    prompt:
      "Which files contain the most important business logic in this repository?",
  },
  {
    icon: GitBranch,
    title: "Trace a feature",
    prompt:
      "Trace the main application flow from the entry point to the core services.",
  },
];

function EmptyChat({
  disabled = false,
  onPromptSelect,
}: EmptyChatProps) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10 sm:px-8">
      <div className="w-full max-w-3xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-500/5">
          <Bot size={32} />
        </div>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-cyan-400">
            <Sparkles size={16} />

            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Repository intelligence
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-bold text-slate-100 sm:text-3xl">
            What do you want to know?
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
            Ask questions about the
            repository architecture,
            implementation, files, or
            application flow. Aegis AI
            will answer using indexed
            repository context.
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {suggestedPrompts.map(
            ({
              icon: Icon,
              title,
              prompt,
            }) => (
              <button
                key={title}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onPromptSelect(prompt)
                }
                className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-500/40 hover:bg-slate-900 hover:shadow-lg hover:shadow-cyan-500/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-slate-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 transition group-hover:bg-cyan-500/10 group-hover:text-cyan-400">
                  <Icon size={19} />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-200">
                  {title}
                </h3>

                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                  {prompt}
                </p>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default EmptyChat;