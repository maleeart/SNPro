import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/login/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
            <span>{user?.email}</span>
            <form action={signOut}>
              <Button variant="ghost" size="sm">ออกจากระบบ</Button>
            </form>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}
