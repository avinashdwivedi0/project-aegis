import { Check, Filter, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { getProjects } from "@/services/project";
import type { Project } from "@/types/project";
import { getRepositories } from "@/services/repository";
import { Button } from "@/components/ui/button";
import {
  listProposals,
  reviewProposal,
  type SelfHealingProposal,
} from "@/services/self-healing";

type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED";

export default function SelfHealingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [proposals, setProposals] = useState<SelfHealingProposal[]>([]);

  // Project/repository context
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string>("");

  // Status filter
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "ALL">("ALL");

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmProposal, setConfirmProposal] = useState<SelfHealingProposal | null>(null);
  const [confirmAction, setConfirmAction] = useState<"APPROVE" | "REJECT" | null>(null);

  // Action feedback
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);

  // Load projects
  useEffect(() => {
    void getProjects()
      .then((response) => {
        setProjects(response.data);
        if (response.data.length > 0) setSelectedProjectId(response.data[0].id);
      })
      .catch(() => {});
  }, []);

  // Load repositories on project change
  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedRepositoryId("");
      return;
    }
    let active = true;
    void getRepositories(selectedProjectId)
      .then((response) => {
        if (active) setSelectedRepositoryId(response.data[0]?.id ?? "");
      })
      .catch(() => { if (active) setSelectedRepositoryId(""); });
  }, [selectedProjectId]);

  // Load proposals on repository/filter change
  useEffect(() => {
    let active = true;
    if (!selectedRepositoryId) {
      setProposals([]);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const statusParam = statusFilter === "ALL" ? undefined : statusFilter;
        const data = await listProposals(selectedRepositoryId, statusParam);
        if (active) { setProposals(data); }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();

    return () => { active = false; };
  }, [selectedRepositoryId, statusFilter]);

  async function handleReview(proposal: SelfHealingProposal, action: "APPROVE" | "REJECT") {
    try {
      await reviewProposal(proposal.id, { status: action === "APPROVE" ? "APPROVED" : "REJECTED" });
      setFeedback({ message: `Proposal ${action.toLowerCase()}d`, success: true });
      const statusParam = statusFilter === "ALL" ? undefined : statusFilter;
      const updated = await listProposals(selectedRepositoryId, statusParam);
      setProposals(updated);
    } catch {
      setFeedback({ message: "Failed to update proposal", success: false });
    } finally {
      setConfirmOpen(false);
      setConfirmProposal(null);
      setConfirmAction(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  const isPending = (proposal: SelfHealingProposal) => proposal.status === "PENDING";

  const confidenceColor = (confidence: number) =>
    confidence > 0.8 ? "text-emerald-600" : confidence > 0.5 ? "text-amber-600" : "text-red-600";

  const statusBadge = (status: ProposalStatus) => {
    const styles = {
      PENDING: "bg-amber-100 text-amber-700",
      APPROVED: "bg-emerald-100 text-emerald-700",
      REJECTED: "bg-red-100 text-red-700",
    };
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-[#dfe4eb] bg-white p-8 text-sm text-[#667085]">
          <Loader2 size={16} className="animate-spin" /> Loading self-healing proposals...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Unable to load self-healing proposals.
        </div>
      )}

      {/* Empty */}
      {!loading && !error && proposals.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#bfd6f8] bg-white px-6 py-12 text-center shadow-[0_10px_30px_rgba(23,32,51,0.04)]">
          <p className="text-lg font-semibold text-[#172033]">No self-healing proposals found.</p>
          <p className="mt-2 text-sm text-[#667085]">
            Run an analysis to generate proposals for locator repair.
          </p>
        </div>
      )}

      {/* Proposals list */}
      {!loading && !error && proposals.length > 0 && (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {statusBadge(proposal.status)}
                    <span className={`text-xs font-medium ${confidenceColor(proposal.confidence)}`}>
                      {(proposal.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-[#172033] mb-1">{proposal.strategy}</h3>
                  <p className="text-xs text-[#667085]">
                    Failed: <code className="bg-[#edf0f4] px-1.5 py-0.5 rounded text-[#344054] text-xs break-all">{proposal.failedLocator}</code>
                  </p>
                  <p className="text-xs text-[#667085]">
                    Proposed: <code className="bg-[#edf0f4] px-1.5 py-0.5 rounded text-[#344054] text-xs break-all">{proposal.proposedLocator}</code>
                  </p>
                  {proposal.reasoning && (
                    <p className="mt-2 text-xs text-[#667085] italic">"{proposal.reasoning}"</p>
                  )}
                </div>

                {isPending(proposal) && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => { setConfirmProposal(proposal); setConfirmAction("REJECT"); setConfirmOpen(true); }}
                    >
                      <Trash2 size={16} className="mr-1" /> Reject
                    </Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => { setConfirmProposal(proposal); setConfirmAction("APPROVE"); setConfirmOpen(true); }}
                    >
                      <Check size={16} className="mr-1" /> Approve
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status Filter */}
      <div className="flex items-center gap-3 rounded-xl border border-[#dfe4eb] bg-white p-4 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
        <Filter size={18} className="text-[#1264d8]" />
        <span className="text-sm font-medium text-[#172033]">Filter by status</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProposalStatus | "ALL")}
          className="ml-auto rounded-lg border border-[#dfe4eb] px-3 py-1.5 text-sm">
          <option value="ALL">All proposals</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Project selector (when multiple projects) */}
      {projects.length > 1 && (
        <div className="rounded-xl border border-[#dfe4eb] bg-white p-4 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
          <label className="text-sm font-medium text-[#667085]">Project</label>
          <select value={selectedProjectId} onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedRepositoryId(""); }}
            className="mt-2 w-full rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-xl p-4 text-sm ${feedback.success ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-600"}`}>
          {feedback.message}
        </div>
      )}

      {/* Inline confirmation dialog */}
      {confirmOpen && confirmProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white p-6 shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#172033]">
              {confirmAction === "APPROVE" ? "Approve" : "Reject"} self-healing proposal?
            </h3>
            <p className="mt-2 text-sm text-[#667085]">
              {confirmAction === "APPROVE"
                ? `Apply the proposed locator "${confirmProposal.proposedLocator}" as the new selector.`
                : `Keep the original failed locator "${confirmProposal.failedLocator}".`}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setConfirmOpen(false); setConfirmProposal(null); setConfirmAction(null); }}>Cancel</Button>
              <Button
                className={confirmAction === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
                onClick={() => handleReview(confirmProposal, confirmAction as "APPROVE" | "REJECT")}
              >
                Confirm {confirmAction}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}