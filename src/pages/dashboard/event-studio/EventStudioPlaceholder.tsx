import type { ReactNode } from "react";
import { ScanLine } from "lucide-react";

export default function EventStudioPlaceholder({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl p-6 sm:p-8">
      <div className="flex flex-col items-start gap-3 max-w-md">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-muted inline-flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-display font-semibold text-foreground text-lg tracking-[-0.01em]">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{body}</p>
        </div>
      </div>
    </div>
  );
}

export function EventStudioCheckInPlaceholder() {
  return (
    <EventStudioPlaceholder
      title="Check-in scanner"
      icon={<ScanLine className="w-5 h-5" />}
      body="Scan tickets at the door when check-in is ready. This tool is coming soon."
    />
  );
}
