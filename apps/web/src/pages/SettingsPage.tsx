import { Bot, KeyRound, Settings } from "lucide-react";

import { EmptyState, PageScaffold } from "@/components/ui/PageScaffold";

function SettingsPage() {
  const cards = [[Bot, "AI providers", "Configure the models used for analysis and chat."], [KeyRound, "Credentials", "Manage secure service connections."], [Settings, "Workspace", "Control defaults and notification behavior."]] as const;

  return (
    <PageScaffold eyebrow="Workspace controls" title="Settings" description="Manage workspace behavior, AI providers, and connection preferences." icon={Settings}>
      <div className="grid gap-5 md:grid-cols-3">{cards.map(([Icon, label, detail]) => <div key={label} className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><Icon className="text-[#1264d8]" size={20} /><h2 className="mt-4 font-semibold text-[#172033]">{label}</h2><p className="mt-2 text-sm leading-6 text-[#667085]">{detail}</p></div>)}</div>
      <EmptyState icon={Settings} title="Settings are ready to configure" description="Workspace preferences will become available as integrations are connected." action="Review workspace" />
    </PageScaffold>
  );
}

export default SettingsPage;