import { toast } from "sonner";

export const appToast = {
  success: (message: string) => toast.success(message),

  error: (message: string) => toast.error(message),

  loading: (message: string) => toast.loading(message),
};
