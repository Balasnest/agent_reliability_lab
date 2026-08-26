import TopBar from "@/components/TopBar";
import ScenarioRail from "@/components/ScenarioRail";
import ChatPanel from "@/components/ChatPanel";
import AgentTracePanel from "@/components/AgentTracePanel";

export default function Home() {
  return (
    <div className="h-full flex flex-col bg-bg text-ink overflow-hidden">
      <TopBar />
      <ScenarioRail />
      <div className="flex-1 flex min-h-0">
        <ChatPanel />
        <AgentTracePanel />
      </div>
    </div>
  );
}
