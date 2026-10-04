import React from "react";
import { redirect } from "next/navigation";
import Header from "@/components/layout/vertical/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Footer from "@/components/layout/footer/page";
import { AppSidebar } from "@/components/layout/vertical/sidebar/app-sidebar";
import { cn } from "@/lib/utils";
import RouteErrorBoundary from "@/components/route-error-boundary";
import { AuthProvider } from "@/lib/context/AuthProvider";
import { getCurrentUserServer } from "@/lib/auth/getCurrentUserServer";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentUserServer();

  if (!profile) {
    redirect("/");
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ "--sidebar-width-icon": "52px" } as React.CSSProperties}
    >
      <AuthProvider>
        <AppSidebar />
        <SidebarInset className="outline outline-border m-2 rounded-none! overflow-hidden">
          <Header />
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className={cn("w-full mx-auto", "container")}>
              <div className=" min-h-[calc(100vh-140px)]">
                <RouteErrorBoundary title="Page error">
                  {children}
                </RouteErrorBoundary>
              </div>
              <div className="pt-6">
                <Footer />
              </div>
            </div>
          </div>
        </SidebarInset>
      </AuthProvider>
    </SidebarProvider>
  );
}
