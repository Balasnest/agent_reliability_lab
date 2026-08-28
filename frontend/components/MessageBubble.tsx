import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type Message = {
  role: "customer" | "agent";
  text: string;
  time: string;
};

export default function MessageBubble({ role, text, time }: Message) {
  if (role === "customer") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-[480px] bg-surface border border-border rounded-tl-[18px] rounded-tr-[18px] rounded-br-[4px] rounded-bl-[18px] px-[18px] py-[13px] text-sm leading-relaxed">
          {text}
        </div>
        <span className="text-[11px] text-faint pr-1">{time}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-1.5 pl-0.5">
        <div className="w-[18px] h-[18px] rounded-[5px] bg-accent flex items-center justify-center">
          <span className="font-serif text-[10px] font-medium text-white">S</span>
        </div>
        <span className="text-[11px] font-semibold tracking-wide uppercase text-accent-deep">
          ShopNova Agent
        </span>
      </div>
      <div className="markdown-body max-w-[560px] bg-accent-soft rounded-tl-[18px] rounded-tr-[18px] rounded-br-[18px] rounded-bl-[4px] px-[18px] py-[14px] text-sm leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <div className="table-scroll">
                <table>{children}</table>
              </div>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
      <span className="text-[11px] text-faint pl-1">{time}</span>
    </div>
  );
}
