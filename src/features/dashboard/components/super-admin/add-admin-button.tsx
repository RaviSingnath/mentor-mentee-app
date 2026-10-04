"use client";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import InviteAdminForm from "./invite-admin-forrm";

export default function AddAdminButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form>
        <DialogTrigger asChild>
          <Button variant="secondary" className="text-primary">
            Add Admin
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Admin</DialogTitle>
            <DialogDescription>
              Add a new admin user. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <InviteAdminForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </form>
    </Dialog>
  );
}
