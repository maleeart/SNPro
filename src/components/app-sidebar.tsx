"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, GanttChartSquare, KanbanSquare,
  Wrench, FolderArchive, Users, Search,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";

const nav = [
  { title: "Dashboard",          url: "/",                icon: LayoutDashboard },
  { title: "ค้นหา",              url: "/search",          icon: Search },
  { title: "Master Timeline",    url: "/timeline",        icon: GanttChartSquare },
  { title: "All Projects",       url: "/projects",        icon: KanbanSquare },
  { title: "Troubleshooting",    url: "/troubleshooting", icon: Wrench },
  { title: "Central Document",   url: "/documents",       icon: FolderArchive },
  { title: "Team & Settings",    url: "/settings",        icon: Users },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-3 font-semibold text-lg group-data-[collapsible=icon]:hidden">
        SNPro
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const active = item.url === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      render={
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
