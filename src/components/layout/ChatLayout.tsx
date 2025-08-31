import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChatLayoutProps {
  children: ReactNode;
  className?: string;
}

export function ChatLayout({ children, className }: ChatLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-background to-muted flex flex-col",
      className
    )}>
      {/* Responsive header: smaller on mobile */}
      <header className="text-center py-4 sm:py-8 px-2">
        <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1 sm:mb-2">
          QuickPrint Web
        </h1>
        <p className="text-muted-foreground text-xs sm:text-base">
          Fast, reliable document printing service
        </p>
      </header>
      {/* Edge-to-edge chat card on mobile, rounded on desktop */}
      <div className="flex-1 w-full max-w-full sm:max-w-4xl mx-auto flex flex-col">
        <div className="bg-card border shadow-elegant flex-1 flex flex-col rounded-none sm:rounded-2xl p-0 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}