import * as ToastPrimitives from "@radix-ui/react-toast";
import { CheckCircle2, CircleAlert } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export type ToastMessage = {
  title: string;
  description?: string;
  variant?: "success" | "error";
};

export function Toaster({
  toast,
  onOpenChange
}: {
  toast: ToastMessage | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ToastPrimitives.Provider swipeDirection="right">
      <ToastPrimitives.Root
        open={Boolean(toast)}
        onOpenChange={onOpenChange}
        className={cn(
          "grid w-full max-w-sm grid-cols-[auto_1fr] items-start gap-3 rounded-lg border bg-background p-4 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-full sm:data-[state=open]:slide-in-from-right-full",
          toast?.variant === "error" ? "border-destructive/40" : "border-success/30"
        )}
      >
        {toast?.variant === "error" ? (
          <CircleAlert className="mt-0.5 h-5 w-5 text-destructive" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
        )}
        <div>
          <ToastPrimitives.Title className="text-sm font-semibold">{toast?.title}</ToastPrimitives.Title>
          {toast?.description ? (
            <ToastPrimitives.Description className="mt-1 text-sm text-muted-foreground">
              {toast.description}
            </ToastPrimitives.Description>
          ) : null}
        </div>
      </ToastPrimitives.Root>
      <ToastPrimitives.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none" />
    </ToastPrimitives.Provider>
  );
}
