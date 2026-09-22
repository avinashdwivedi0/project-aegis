import { Bot, KeyRound, Loader2, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";

import { PageScaffold } from "@/components/ui/PageScaffold";
import { getCurrentUser, updatePreferences, type User } from "@/services/auth";

function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [defaultRef, setDefaultRef] = useState(() => localStorage.getItem("defaultAnalysisRef") ?? "HEAD");
  const [polling, setPolling] = useState(() => localStorage.getItem("analysisPolling") !== "off");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    void getCurrentUser().then((response) => {
      setUser(response.data);
      const preferences = response.data.preferences ?? {};
      if (preferences.defaultRef) setDefaultRef(preferences.defaultRef);
      if (preferences.polling !== undefined) setPolling(preferences.polling);
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  async function savePreferences() {
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
    }
  }

  return (
    <PageScaffold eyebrow="Workspace controls" title="Settings" description="Manage workspace behavior, AI providers, and connection preferences." icon={Settings}>
      {loading && <div className="flex items-center gap-2 rounded-xl border border-[#dfe4eb] bg-white p-8 text-sm text-[#667085]"><Loader2 className="animate-spin" size={18} /> Loading account settings...</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load account settings. Sign in to manage this workspace.</div>}
      {!loading && !error && <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><section className="rounded-xl border border-[#dfe4eb] bg-white p-6 shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><div className="flex items-center gap-3"><KeyRound className="text-[#1264d8]" size={21} /><div><h2 className="font-semibold text-[#172033]">Account</h2><p className="mt-1 text-sm text-[#667085]">Authenticated workspace identity.</p></div></div><dl className="mt-6 space-y-4 text-sm"><div><dt className="text-xs text-[#667085]">Name</dt><dd className="mt-1 font-medium text-[#172033]">{user?.name}</dd></div><div><dt className="text-xs text-[#667085]">Email</dt><dd className="mt-1 font-medium text-[#172033]">{user?.email}</dd></div><div><dt className="text-xs text-[#667085]">Role</dt><dd className="mt-1 font-medium capitalize text-[#172033]">{user?.role.toLowerCase()}</dd></div></dl></section><section className="rounded-xl border border-[#dfe4eb] bg-white p-6 shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><div className="flex items-center gap-3"><Bot className="text-[#1264d8]" size={21} /><div><h2 className="font-semibold text-[#172033]">Workspace defaults</h2><p className="mt-1 text-sm text-[#667085]">Settings used by analysis screens.</p></div></div><label className="mt-6 block text-sm font-medium text-[#344054]" htmlFor="default-ref">Default analysis ref<input id="default-ref" value={defaultRef} onChange={(event) => setDefaultRef(event.target.value)} className="mt-2 block w-full rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm" /></label><label className="mt-5 flex items-center gap-3 text-sm text-[#344054]"><input type="checkbox" checked={polling} onChange={(event) => setPolling(event.target.checked)} />Enable live analysis progress polling</label>{saveError && <p className="mt-3 text-sm text-red-600">Unable to save preferences.</p>}<button type="button" onClick={() => void savePreferences()} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1264d8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b4da8]"><Save size={16} />{saved ? "Preferences saved" : "Save preferences"}</button></section></div>}
    </PageScaffold>
  );
}

export default SettingsPage;