import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChatLayoutProps {
  children: ReactNode;
  className?: string;
}

export function ChatLayout({ children, className }: ChatLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-background to-muted",
      className
    )}>
      <div className="max-w-4xl mx-auto p-4">
        <header className="text-center py-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            QuickPrint Web
          </h1>
          <p className="text-muted-foreground">
            Fast, reliable document printing service
          </p>
        </header>
        
        <div className="bg-card rounded-2xl shadow-elegant border p-6">
          {children}
        </div>
      </div>
    </div>
  );
}