import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  type: "user" | "assistant" | "system";
  children: ReactNode;
  timestamp?: string;
  className?: string;
}

export function ChatMessage({ type, children, timestamp, className }: ChatMessageProps) {
  const isUser = type === "user";
  const isSystem = type === "system";
  
  return (
    <div className={cn(
      "flex gap-3 mb-4 animate-slide-in-up",
      isUser && "flex-row-reverse",
      className
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
        isUser ? "bg-chat-user text-chat-user-foreground" : "bg-chat-assistant text-chat-assistant-foreground",
        isSystem && "bg-accent text-accent-foreground"
      )}>
        {isUser ? "U" : isSystem ? "S" : "🖨️"}
      </div>
      
      {/* Message bubble */}
      <div className={cn(
        "flex-1 max-w-[80%] space-y-2",
        isUser && "items-end"
      )}>
        <div className={cn(
          "rounded-2xl px-4 py-3 shadow-sm",
          isUser 
            ? "bg-chat-user text-chat-user-foreground rounded-tr-md" 
            : "bg-chat-assistant text-chat-assistant-foreground rounded-tl-md",
          isSystem && "bg-accent text-accent-foreground rounded-md"
        )}>
          <div className="text-sm leading-relaxed">
            {children}
          </div>
        </div>
        
        {timestamp && (
          <div className={cn(
            "text-xs text-muted-foreground px-2",
            isUser && "text-right"
          )}>
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}