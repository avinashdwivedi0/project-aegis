import { Filter, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { getAuditLogs } from "@/services/analysis";

type AuditLog = {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, any>;
  success: boolean;
  createdAt: string;
};

type AuditLogFilters = {
  actorId: string;
  targetType: string;
  targetId: string;
  success: string;
};

const actionStyles: Record<string, string> = {
  BRIDGE_CREATE: "bg-blue-100 text-blue-700",
  PATCH_GENERATE: "bg-emerald-100 text-emerald-700",
  PATCH_REJECT: "bg-red-100 text-red-700",
  PATCH_VALIDATE: "bg-amber-100 text-amber-700",
  PATCH_APPLY: "bg-purple-100 text-purple-700",
};

const targetTypeStyles: Record<string, string> = {
  AnalysisRun: "bg-slate-100 text-slate-700",
  Finding: "bg-indigo-100 text-indigo-700",
  Patch: "bg-violet-100 text-violet-700",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilters>({
    actorId: "",
    targetType: "",
    targetId: "",
    success: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const limit = 25;

  useEffect(() => {
    let active = true;

    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setError(false);
      try {
        const result = await getAuditLogs(
          undefined,
          limit,
          (page - 1) * limit,
          filters.actorId || undefined,
          filters.targetType || undefined,
          filters.targetId || undefined,
        );
        if (!active) return;
        setLogs(result.logs);
        setTotal(result.total);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [page, filters]);

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ actorId: "", targetType: "", targetId: "", success: "" });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMetadata = (metadata: Record<string, any>) => {
    return Object.entries(metadata)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join("; ");
  };

  return (
    <section className="space-y-5 rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1264d8]">Governance</p>
          <h2 className="mt-1 text-xl font-semibold text-[#172033]">Audit Log</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-lg border border-[#dfe4eb] p-2 text-[#1264d8] hover:bg-[#f8fafc]"
            aria-label="Toggle filters"
            title="Toggle filters"
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-4 bg-[#f8fafc] rounded-lg border border-[#edf0f4]">
          <input
            type="text"
            placeholder="Actor ID"
            value={filters.actorId}
            onChange={(e) => handleFilterChange("actorId", e.target.value)}
            className="rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm text-[#344054] placeholder:text-[#98a2b3] w-48"
          />
          <input
            type="text"
            placeholder="Target Type"
            value={filters.targetType}
            onChange={(e) => handleFilterChange("targetType", e.target.value)}
            className="rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm text-[#344054] placeholder:text-[#98a2b3] w-48"
          />
          <input
            type="text"
            placeholder="Target ID"
            value={filters.targetId}
            onChange={(e) => handleFilterChange("targetId", e.target.value)}
            className="rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm text-[#344054] placeholder:text-[#98a2b3] w-48"
          />
          <select
            value={filters.success}
            onChange={(e) => handleFilterChange("success", e.target.value)}
            className="rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm text-[#344054]"
          >
            <option value="">All results</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              <X className="inline w-4 h-4 mr-1" />
              Clear
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-[#667085]">
          <Loader2 className="animate-spin" size={17} />
          Loading audit logs...
        </div>
      )}
      {error && <p className="py-8 text-sm text-red-600">Unable to load audit logs.</p>}
      {!loading && !error && logs.length === 0 && (
        <p className="py-8 text-sm text-[#667085]">No audit logs match the selected filters.</p>
      )}
      {!loading && !error && logs.length > 0 && (
        <div className="divide-y divide-[#edf0f4]">
          {logs.map((log) => (
            <div
              key={log.id}
              className="py-4 hover:bg-[#f8fafc] transition-colors"
            >
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    actionStyles[log.action] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {log.action}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    targetTypeStyles[log.targetType] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {log.targetType}
                </span>
                <span className="text-xs font-medium text-[#667085]">
                  {log.success ? "✓ Success" : "✗ Failed"}
                </span>
                <span className="text-xs text-[#98a2b3] ml-auto">
                  {formatDate(log.createdAt)}
                </span>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[#667085]">Actor ID</dt>
                  <dd className="mt-1 font-mono text-[#172033] break-all">{log.actorId}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#667085]">Target ID</dt>
                  <dd className="mt-1 font-mono text-[#172033] break-all">{log.targetId}</dd>
                </div>
              </div>
              {Object.keys(log.metadata).length > 0 && (
                <div className="mt-3 p-3 bg-[#f8fafc] rounded-lg">
                  <dt className="text-xs text-[#667085]">Metadata</dt>
                  <dd className="mt-1 text-xs font-mono text-[#344054] break-all">
                    {formatMetadata(log.metadata)}
                  </dd>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {!loading && !error && total > limit && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-[#dfe4eb] px-4 py-2 text-sm font-medium text-[#172033] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-[#667085]">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
            disabled={page >= Math.ceil(total / limit)}
            className="rounded-lg border border-[#dfe4eb] px-4 py-2 text-sm font-medium text-[#172033] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}