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
import PersonalInfoForm from "./dialogs/personal-info-form";

export default function EditPersonalInfoButton({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form>
        <DialogTrigger asChild>
          <Button className="flex items-center gap-1.5 rounded-md">
            {children}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Admin</DialogTitle>
            <DialogDescription>
              Edit your personal info. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <PersonalInfoForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </form>
    </Dialog>
  );
}
