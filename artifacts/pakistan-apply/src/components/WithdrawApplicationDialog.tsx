import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface WithdrawApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  universityName: string;
  onConfirm: () => void;
  isPending: boolean;
}

export default function WithdrawApplicationDialog({
  open,
  onOpenChange,
  universityName,
  onConfirm,
  isPending,
}: WithdrawApplicationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw application?</DialogTitle>
          <DialogDescription>
            This will withdraw your submitted application to{" "}
            <strong>{universityName}</strong>. The university will no longer review it, and
            this action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Yes, withdraw
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
