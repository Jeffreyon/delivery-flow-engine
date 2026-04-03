import { AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LoadErrorCardProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function LoadErrorCard({
  title,
  description,
  actionLabel = "Try again",
  onAction,
}: LoadErrorCardProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="items-start">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      {onAction && (
        <CardContent>
          <button
            type="button"
            onClick={onAction}
            className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted/60"
          >
            {actionLabel}
          </button>
        </CardContent>
      )}
    </Card>
  );
}
