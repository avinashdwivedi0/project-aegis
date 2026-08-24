export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 w-fit">
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
    </div>
  );
}