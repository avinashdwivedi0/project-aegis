import { Check, ChevronDown, Filter, Loader2, RotateCcw, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { getProjects } from "@/services/project";
import type { Project } from "@/types/project";
import { getRepositories } from "@/services/repository";
import type { Repository } from "@/types/repository";
import { Button } from "@/components/ui/button";
import {
  listProposals,
  reviewProposal,
  retryProposal,
  validateProposal,
  type SelfHealingProposal,
} from "@/services/self-healing";

type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED" | "VALIDATING" | "VALIDATED" | "ROLLED_BACK";

export default function SelfHealingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [proposals, setProposals] = useState<SelfHealingProposal[]>([]);

  // Project/repository context
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(null);

  // Status filter
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "ALL">("ALL");

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmProposal, setConfirmProposal] = useState<SelfHealingProposal | null>(null);
  const [confirmAction, setConfirmAction] = useState<"APPROVE" | "REJECT" | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const [validationProposal, setValidationProposal] = useState<SelfHealingProposal | null>(null);
  const [validationPassed, setValidationPassed] = useState<boolean | null>(null);

  // Action feedback
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);

  // Load projects
  useEffect(() => {
    void getProjects()
      .then((response) => {
        setProjects(response.data);
        if (response.data.length > 0) setSelectedProjectId(response.data[0].id);
      })
      .catch(() => setError(true));
  }, []);

  // Load repositories on project change
  useEffect(() => {
    if (!selectedProjectId) return;
    let active = true;
    void getRepositories(selectedProjectId)
      .then((response) => {
        if (!active) return;
        setRepositories(response.data);
        setSelectedRepositoryId(response.data[0]?.id ?? "");
        if (response.data.length === 0) {
          setProposals([]);
          setLoading(false);
        }
      })
      .catch(() => { if (active) { setRepositories([]); setSelectedRepositoryId(""); setLoading(false); setError(true); } });
    return () => { active = false; };
  }, [selectedProjectId]);

  // Load proposals on repository/filter change
  useEffect(() => {
    if (!selectedRepositoryId) {
      setLoading(false);
      return;
    }
    let active = true;

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

  async function handleValidation(proposal: SelfHealingProposal, passed: boolean) {
    try {
      await validateProposal(
        proposal.id,
        passed,
        passed
          ? "Re-test passed with the approved locator."
          : "Re-test failed; proposal rolled back.",
      );
      setFeedback({
        message: passed ? "Proposal validated." : "Proposal rolled back.",
        success: true,
      });
      const statusParam = statusFilter === "ALL" ? undefined : statusFilter;
      const updated = await listProposals(selectedRepositoryId, statusParam);
      setProposals(updated);
    } catch {
      setFeedback({ message: "Failed to validate proposal", success: false });
    } finally {
      setValidationOpen(false);
      setValidationProposal(null);
      setValidationPassed(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  async function handleRetry(proposal: SelfHealingProposal) {
    try {
      await retryProposal(proposal.id);
      setFeedback({ message: "New proposal generated for review.", success: true });
      const statusParam = statusFilter === "ALL" ? undefined : statusFilter;
      const updated = await listProposals(selectedRepositoryId, statusParam);
      setProposals(updated);
    } catch {
      setFeedback({ message: "Failed to retry proposal", success: false });
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  const isPending = (proposal: SelfHealingProposal) => proposal.status === "PENDING";
  const isApproved = (proposal: SelfHealingProposal) => proposal.status === "APPROVED";
  const isRetryable = (proposal: SelfHealingProposal) =>
    (proposal.status === "ROLLED_BACK" || proposal.status === "REJECTED") && proposal.retryCount < 3;

  const confidenceColor = (confidence: number) =>
    confidence > 0.8 ? "text-emerald-600" : confidence > 0.5 ? "text-amber-600" : "text-red-600";

  const statusBadge = (status: ProposalStatus) => {
    const styles = {
      PENDING: "bg-amber-100 text-amber-700",
      APPROVED: "bg-emerald-100 text-emerald-700",
      REJECTED: "bg-red-100 text-red-700",
      VALIDATING: "bg-sky-100 text-sky-700",
      VALIDATED: "bg-violet-100 text-violet-700",
      ROLLED_BACK: "bg-slate-100 text-slate-700",
    };
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>{status}</span>;
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredProposals = proposals.filter((proposal) =>
    !normalizedSearch || [
      proposal.testCaseId,
      proposal.testRunId,
      proposal.strategy,
      proposal.failedLocator,
      proposal.proposedLocator,
      proposal.reasoning,
    ].some((value) => value.toLowerCase().includes(normalizedSearch)),
  );

  return (
    <div className="space-y-6">
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Proposals", value: proposals.length },
            { label: "Pending review", value: proposals.filter((proposal) => proposal.status === "PENDING").length },
            { label: "Validated", value: proposals.filter((proposal) => proposal.status === "VALIDATED").length },
            { label: "Rolled back", value: proposals.filter((proposal) => proposal.status === "ROLLED_BACK").length },
          ].map((metric) => (
            <div key={metric.label} className="rounded-lg border border-[#dfe4eb] bg-white px-4 py-3">
              <p className="text-xs font-medium text-[#667085]">{metric.label}</p>
              <p className="mt-1 text-xl font-semibold text-[#172033]">{metric.value}</p>
            </div>
          ))}
        </div>
      )}

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
          <p className="text-lg font-semibold text-[#172033]">{selectedRepositoryId ? "No self-healing proposals found." : "No repository selected."}</p>
          <p className="mt-2 text-sm text-[#667085]">
            {selectedRepositoryId ? "Run an analysis to generate proposals for locator repair." : "Choose a project with a repository to inspect healing proposals."}
          </p>
        </div>
      )}

      {!loading && !error && proposals.length > 0 && filteredProposals.length === 0 && (
        <div className="rounded-lg border border-[#dfe4eb] bg-white p-6 text-sm text-[#667085]">
          No proposals match “{searchQuery}”.
        </div>
      )}

      {/* Proposals list */}
      {!loading && !error && filteredProposals.length > 0 && (
        <div className="space-y-4">
          {filteredProposals.map((proposal) => (
            <div key={proposal.id} className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {statusBadge(proposal.status)}
                    <span className={`text-xs font-medium ${confidenceColor(proposal.confidence)}`}>
                      {(proposal.confidence * 100).toFixed(0)}% confidence
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#1264d8]"
                      aria-expanded={expandedProposalId === proposal.id}
                      onClick={() => setExpandedProposalId(expandedProposalId === proposal.id ? null : proposal.id)}
                    >
                      Evidence <ChevronDown size={14} className={expandedProposalId === proposal.id ? "rotate-180" : ""} />
                    </button>
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
                  <p className="mt-2 text-xs text-[#667085]">Retries: {proposal.retryCount}/3</p>
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

                {isApproved(proposal) && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50"
                      onClick={() => { setValidationProposal(proposal); setValidationPassed(false); setValidationOpen(true); }}
                    >
                      Roll back
                    </Button>
                  </div>
                )}

                {isRetryable(proposal) && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-sky-200 text-sky-700 hover:bg-sky-50"
                      onClick={() => void handleRetry(proposal)}
                    >
                      <RotateCcw size={16} className="mr-1" /> Retry
                    </Button>
                  </div>
                )}

                {(proposal.status === "ROLLED_BACK" || proposal.status === "REJECTED") && proposal.retryCount >= 3 && (
                  <span className="text-xs font-medium text-[#667085]">Retry limit reached</span>
                )}
              </div>
              {expandedProposalId === proposal.id && (
                <div className="mt-4 grid gap-4 border-t border-[#edf0f4] pt-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-2">
                    <p className="text-xs text-[#667085]">Test case: <span className="font-medium text-[#344054]">{proposal.testCaseId}</span></p>
                    <p className="text-xs text-[#667085]">Run: <span className="font-medium text-[#344054]">{proposal.testRunId}</span></p>
                    {proposal.parentProposalId && <p className="text-xs text-[#667085]">Retry of proposal: <span className="font-medium text-[#344054]">{proposal.parentProposalId}</span></p>}
                    <p className="text-xs text-[#667085]">Created: <span className="font-medium text-[#344054]">{new Date(proposal.createdAt).toLocaleString()}</span></p>
                    <p className="text-xs font-medium text-[#344054]">DOM snapshot</p>
                    <pre className="max-h-64 overflow-auto rounded-md bg-[#f7f8fa] p-3 text-xs text-[#344054] whitespace-pre-wrap break-all">
                      {proposal.domSnapshot.slice(0, 12_000)}{proposal.domSnapshot.length > 12_000 ? "\n[Snapshot truncated]" : ""}
                    </pre>
                  </div>
                  {proposal.screenshot.startsWith("data:image/") && (
                    <img src={proposal.screenshot} alt={`Failure evidence for ${proposal.testCaseId}`} loading="lazy" className="max-h-64 w-full rounded-md border border-[#dfe4eb] object-contain" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Status Filter */}
      <div className="flex items-center gap-3 rounded-xl border border-[#dfe4eb] bg-white p-4 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
        <Filter size={18} className="text-[#1264d8]" />
        <label htmlFor="proposal-status" className="text-sm font-medium text-[#172033]">Status</label>
        <select id="proposal-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProposalStatus | "ALL")}
          className="ml-auto rounded-lg border border-[#dfe4eb] px-3 py-1.5 text-sm">
          <option value="ALL">All proposals</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="VALIDATING">Validating</option>
          <option value="VALIDATED">Validated</option>
          <option value="REJECTED">Rejected</option>
          <option value="ROLLED_BACK">Rolled back</option>
        </select>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-[#dfe4eb] bg-white px-4 py-3">
        <Search size={17} className="shrink-0 text-[#667085]" />
        <input
          type="search"
          aria-label="Search self-healing proposals"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search test case, locator, run, or reasoning"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#98a2b3]"
        />
      </div>

      {repositories.length > 1 && (
        <div className="rounded-lg border border-[#dfe4eb] bg-white p-4">
          <label htmlFor="healing-repository" className="text-sm font-medium text-[#667085]">Repository</label>
          <select id="healing-repository" value={selectedRepositoryId} onChange={(event) => setSelectedRepositoryId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm">
            {repositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.name}</option>)}
          </select>
        </div>
      )}

      {/* Project selector (when multiple projects) */}
      {projects.length > 1 && (
        <div className="rounded-xl border border-[#dfe4eb] bg-white p-4 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
          <label className="text-sm font-medium text-[#667085]">Project</label>
          <select value={selectedProjectId} onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedRepositoryId(""); setProposals([]); setLoading(Boolean(e.target.value)); }}
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

      {validationOpen && validationProposal && validationPassed !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white p-6 shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#172033]">
              {validationPassed ? "Validate" : "Rollback"} self-healing proposal?
            </h3>
            <p className="mt-2 text-sm text-[#667085]">
              {validationPassed
                ? `The rerun passed with locator "${validationProposal.proposedLocator}".`
                : `The rerun still failed, so this proposal should be rolled back.`}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setValidationOpen(false); setValidationProposal(null); setValidationPassed(null); }}>Cancel</Button>
              <Button
                className={validationPassed ? "bg-violet-600 hover:bg-violet-700" : "bg-slate-600 hover:bg-slate-700"}
                onClick={() => handleValidation(validationProposal, validationPassed)}
              >
                Confirm {validationPassed ? "Validated" : "Rolled back"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
