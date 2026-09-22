import { FileDiff } from "lucide-react";

export default function DiffViewer({ diff }: { diff?: string }) {
  if (!diff) {
    return <div className="rounded-lg border border-dashed border-[#bfd6f8] bg-[#f8fbff] p-4 text-sm text-[#667085]">No patch has been generated for this finding.</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#dfe4eb] bg-[#172033]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/70"><FileDiff size={15} /> Patch preview</div>
      <pre className="max-h-80 overflow-auto p-4 text-xs leading-6 text-white/90">{diff.split("\n").map((line, index) => <code key={`${index}-${line}`} className={`block ${line.startsWith("+") ? "bg-emerald-500/20 text-emerald-200" : line.startsWith("-") ? "bg-red-500/20 text-red-200" : ""}`}>{line}</code>)}</pre>
    </div>
  );
}
