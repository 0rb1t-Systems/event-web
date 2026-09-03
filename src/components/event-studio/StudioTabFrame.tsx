import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

/** Shared Event Studio tab chrome. Keep panels inside; do not invent new APIs. */
export function StudioTabFrame({ title, description, children }: Props) {
  return (
    <div className="flex flex-col gap-4 min-w-0 w-full">
      <div className="px-2 lg:px-0">
        <h2 className="font-head text-[15px] font-semibold text-oc-ink tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-oc-muted max-w-[60ch] text-pretty">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
