import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Server, FolderTree, Terminal, User, Settings, Shield, LogOut, Bell } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/brand/Logo";
import { Backdrop } from "@/components/brand/Backdrop";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ReactNode } from "react";

const nav = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { title: "Servers", to: "/servers", icon: Server },
  { title: "Account", to: "/account", icon: User },
  { title: "Settings", to: "/settings", icon: Settings },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Backdrop />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const meFn = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: meFn });
  const isAdmin = me.data?.roles.includes("admin");

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5">
      <SidebarHeader className="p-3">
        <Link to="/dashboard"><Logo showText={!collapsed} /></Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.to} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/admin")}>
                    <Link to="/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Admin</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 text-xs text-muted-foreground">
        {!collapsed && <span>v1.0 · Lave Hosting</span>}
      </SidebarFooter>
    </Sidebar>
  );
}

function TopBar() {
  const meFn = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: meFn });
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const initials = (me.data?.profile?.display_name ?? me.data?.profile?.username ?? "U")
    .split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/5 bg-background/60 px-4 backdrop-blur-xl sm:px-6">
      <SidebarTrigger className="-ml-1" />
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-white/5">
              <Avatar className="h-7 w-7">
                <AvatarImage src={me.data?.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-xs text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">
                {me.data?.profile?.display_name ?? me.data?.profile?.username ?? "User"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{me.data?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/account">Account</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
