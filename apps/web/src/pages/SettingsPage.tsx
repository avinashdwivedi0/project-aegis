import { Bot, KeyRound, Loader2, Save, Settings, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { PageScaffold } from "@/components/ui/PageScaffold";
import { getCurrentUser, updatePreferences, type User } from "@/services/auth";
import { getProjects } from "@/services/project";
import type { Project } from "@/types/project";
import {
  getGuardrailSettings,
  saveGuardrailSettings,
  type GuardrailSettings,
} from "@/services/guardrail";

function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [defaultRef, setDefaultRef] = useState(() => localStorage.getItem("defaultAnalysisRef") ?? "HEAD");
  const [polling, setPolling] = useState(() => localStorage.getItem("analysisPolling") !== "off");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Project + guardrail state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [guardrails, setGuardrails] = useState<GuardrailSettings | null>(null);
  const [guardrailsLoading, setGuardrailsLoading] = useState(false);
  const [guardrailsSaved, setGuardrailsSaved] = useState(false);
  const [guardrailsError, setGuardrailsError] = useState(false);
  const [savingGuardrails, setSavingGuardrails] = useState(false);

  // Form state (controlled fields)
  const [maxPatchRiskScore, setMaxPatchRiskScore] = useState(75);
  const [requireManualApprovalForCritical, setRequireManualApprovalForCritical] = useState(false);
  const [sandboxOnly, setSandboxOnly] = useState(false);
  const [guardrailScope, setGuardrailScope] = useState<"ADVISORY" | "ENFORCED">("ADVISORY");

  useEffect(() => {
    void getCurrentUser().then((response) => {
      setUser(response.data);
      const preferences = response.data.preferences ?? {};
      if (preferences.defaultRef) setDefaultRef(preferences.defaultRef);
      if (preferences.polling !== undefined) setPolling(preferences.polling);
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  // Load projects for guardrail scoping
  useEffect(() => {
    void getProjects().then((response) => {
      setProjects(response.data);
    }).catch(() => setGuardrailsError(true));
  }, []);

  // Load guardrail settings when project changes
  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    let active = true;

    async function load() {
      setGuardrailsLoading(true);
      setGuardrailsError(false);
      try {
        const settings = await getGuardrailSettings(selectedProjectId);
        if (active) {
          setGuardrails(settings);
          setMaxPatchRiskScore(settings.maxPatchRiskScore);
          setRequireManualApprovalForCritical(settings.requireManualApprovalForCritical);
          setSandboxOnly(settings.sandboxOnly);
          setGuardrailScope(settings.scope);
        }
      } catch {
        if (active) setGuardrailsError(true);
      } finally {
        if (active) setGuardrailsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  async function savePreferences() {
    if (savingPreferences) return;
    setSavingPreferences(true);
    try {
      const preferences = { defaultRef: defaultRef.trim() || "HEAD", polling };
      await updatePreferences(preferences);
      localStorage.setItem("defaultAnalysisRef", preferences.defaultRef);
      localStorage.setItem("analysisPolling", polling ? "on" : "off");
      setSaveError(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch {
      setSaveError(true);
    } finally { setSavingPreferences(false); }
  }

  async function saveGuardrailPrefs() {
    if (!selectedProjectId) return;
    if (savingGuardrails) return;
    setSavingGuardrails(true);
    setGuardrailsError(false);
    try {
      await saveGuardrailSettings(selectedProjectId, {
        maxPatchRiskScore,
        requireManualApprovalForCritical,
        sandboxOnly,
        scope: guardrailScope,
      });
      setGuardrailsSaved(true);
      window.setTimeout(() => setGuardrailsSaved(false), 2200);
    } catch {
      setGuardrailsError(true);
    } finally { setSavingGuardrails(false); }
  }

  return (
    <PageScaffold eyebrow="Workspace controls" title="Settings" description="Manage workspace behavior, AI providers, and connection preferences." icon={Settings}>
      {loading && <div className="flex items-center gap-2 rounded-xl border border-[#dfe4eb] bg-white p-8 text-sm text-[#667085]"><Loader2 className="animate-spin" size={18} /> Loading account settings...</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load account settings. Sign in to manage this workspace.</div>}
      {!loading && !error && <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-xl border border-[#dfe4eb] bg-white p-6 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
          <div className="flex items-center gap-3"><KeyRound className="text-[#1264d8]" size={21} /><div><h2 className="font-semibold text-[#172033]">Account</h2><p className="mt-1 text-sm text-[#667085]">Authenticated workspace identity.</p></div></div>
          <dl className="mt-6 space-y-4 text-sm">
            <div><dt className="text-xs text-[#667085]">Name</dt><dd className="mt-1 font-medium text-[#172033]">{user?.name}</dd></div>
            <div><dt className="text-xs text-[#667085]">Email</dt><dd className="mt-1 font-medium text-[#172033]">{user?.email}</dd></div>
            <div><dt className="text-xs text-[#667085]">Role</dt><dd className="mt-1 font-medium capitalize text-[#172033]">{user?.role.toLowerCase()}</dd></div>
          </dl>
        </section>

        <section className="rounded-xl border border-[#dfe4eb] bg-white p-6 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
          <div className="flex items-center gap-3"><Bot className="text-[#1264d8]" size={21} /><div><h2 className="font-semibold text-[#172033]">Workspace defaults</h2><p className="mt-1 text-sm text-[#667085]">Settings used by analysis screens.</p></div></div>
          <label className="mt-6 block text-sm font-medium text-[#344054]" htmlFor="default-ref">Default analysis ref<input id="default-ref" value={defaultRef} onChange={(event) => setDefaultRef(event.target.value)} className="mt-2 block w-full rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm" /></label>
          <label className="mt-5 flex items-center gap-3 text-sm text-[#344054]"><input type="checkbox" checked={polling} onChange={(event) => setPolling(event.target.checked)} />Enable live analysis progress polling</label>
          {saveError && <p className="mt-3 text-sm text-red-600">Unable to save preferences.</p>}
          <button type="button" onClick={() => void savePreferences()} disabled={savingPreferences} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1264d8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b4da8] disabled:opacity-50"><Save size={16} />{savingPreferences ? "Saving…" : saved ? "Preferences saved" : "Save preferences"}</button>
        </section>
      </div>}

      <div className="mt-6 rounded-xl border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <ShieldAlert className="inline-block mr-2 -mt-0.5" size={18} />
        <strong>{guardrailScope === "ENFORCED" ? "Enforced mode" : "Advisory mode"}.</strong> Project guardrails are enforced server-side only when the scope is set to <span className="font-semibold">ENFORCED</span>.
      </div>

      {!loading && (
        <section className="mt-6 rounded-xl border border-[#dfe4eb] bg-white p-6 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
          <div className="flex items-center gap-3"><ShieldAlert className="text-amber-600" size={21} /><div><h2 className="font-semibold text-[#172033]">Guardrail Settings</h2><p className="mt-1 text-sm text-[#667085]">Patch-repair guardrails that are enforced server-side in ENFORCED mode.</p></div></div>

          <label className="mt-6 block text-sm font-medium text-[#344054]" htmlFor="guardrail-project">Project</label>
          <select
            id="guardrail-project"
            value={selectedProjectId}
            onChange={(event) => { setSelectedProjectId(event.target.value); setGuardrails(null); }}
            className="mt-2 block w-full rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm"
          >
            <option value="">Select a project…</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>

          {selectedProjectId && (
            <>
              {guardrailsLoading && <div className="mt-4 flex items-center gap-2 text-sm text-[#667085]"><Loader2 className="animate-spin" size={16} /> Loading guardrail settings…</div>}
              {guardrailsError && <p className="mt-3 text-sm text-red-600">Unable to load guardrail settings.</p>}

              {guardrails && (
                <>
                  <label className="mt-5 block text-sm font-medium text-[#344054]" htmlFor="guardrail-scope">Guardrail scope
                    <select id="guardrail-scope" value={guardrailScope} onChange={(event) => setGuardrailScope(event.target.value as "ADVISORY" | "ENFORCED")} className="mt-2 block w-full rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm">
                      <option value="ADVISORY">ADVISORY</option>
                      <option value="ENFORCED">ENFORCED</option>
                    </select>
                  </label>
                  <label className="mt-5 block text-sm font-medium text-[#344054]" htmlFor="guardrail-risk-score">Max patch risk score
                    <input id="guardrail-risk-score" type="number" min={0} max={100} value={maxPatchRiskScore} onChange={(event) => setMaxPatchRiskScore(Number(event.target.value))} className="mt-2 block w-full rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm" />
                  </label>
                  <label className="mt-5 flex items-center gap-3 text-sm text-[#344054]"><input type="checkbox" checked={requireManualApprovalForCritical} onChange={(event) => setRequireManualApprovalForCritical(event.target.checked)} />Require manual approval for critical findings</label>
                  <label className="mt-5 flex items-center gap-3 text-sm text-[#344054]"><input type="checkbox" checked={sandboxOnly} onChange={(event) => setSandboxOnly(event.target.checked)} />Sandbox-only patches</label>

                  <div className="mt-5 flex items-center gap-3">
                    <button type="button" onClick={() => void saveGuardrailPrefs()} disabled={savingGuardrails || guardrailsLoading} className="inline-flex items-center gap-2 rounded-lg bg-[#1264d8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b4da8] disabled:opacity-50"><Save size={16} />{savingGuardrails ? "Saving…" : guardrailsSaved ? "Settings saved" : "Save guardrail settings"}</button>
                    {guardrailsSaved && <span className="text-sm text-green-600">✓ Saved</span>}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}
    </PageScaffold>
  );
}

export default SettingsPage;
