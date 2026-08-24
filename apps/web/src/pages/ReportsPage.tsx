import { ClipboardCheck, Download, FileBarChart2 } from "lucide-react";

import { EmptyState, PageScaffold } from "@/components/ui/PageScaffold";

function ReportsPage() {
  return (
    <PageScaffold eyebrow="Assessment archive" title="Reports" description="Review quality findings, compare assessment runs, and export evidence for your team." icon={FileBarChart2}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-[#dfe4eb] bg-white p-6 shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><ClipboardCheck className="text-[#1264d8]" size={22} /><h2 className="mt-4 font-semibold text-[#172033]">Assessment reports</h2><p className="mt-2 text-sm leading-6 text-[#667085]">Findings and recommendations from completed repository runs.</p></div>
        <div className="rounded-xl border border-[#dfe4eb] bg-white p-6 shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><Download className="text-[#1264d8]" size={22} /><h2 className="mt-4 font-semibold text-[#172033]">Export center</h2><p className="mt-2 text-sm leading-6 text-[#667085]">Generate shareable evidence when a report is ready.</p></div>
      </div>
      <EmptyState icon={FileBarChart2} title="No reports generated" description="Complete an analysis run to create your first quality report." action="Start an analysis" />
    </PageScaffold>
  );
}

export default ReportsPage;