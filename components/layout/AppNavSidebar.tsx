"use client";

/**
 * AppNavSidebar  —  permanent collapsible drawer
 *
 * Thin orchestrator: owns drawer sizing/transition and delegates each visual
 * section to a focused sub-component.
 *
 * ── Sub-components ────────────────────────────────────────────────────────
 *  sidebar/SidebarHeader   — logo + click-to-home
 *  sidebar/SidebarNavList  — scrollable list of nav items
 *
 * ── Layout behaviour ──────────────────────────────────────────────────────
 *  open=true   → full width (260 px), labels visible
 *  open=false  → icon-only width (64 px), labels fade out
 *
 * ── Related files ─────────────────────────────────────────────────────────
 *  sidebar/navItems.ts        — nav item definitions + useNavItems hook
 *  sidebar/SidebarNavItem.tsx — single nav row (active state, icon, label)
 */

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import Drawer from "@mui/material/Drawer";
import SidebarHeader from "./sidebar/SidebarHeader";
import SidebarNavList from "./sidebar/SidebarNavList";

// ── Drawer width constants ─────────────────────────────────────────────────
const drawerWidth = 260;
const miniDrawerWidth = 64;

interface AppNavSidebarProps {
  /** Whether the sidebar is currently expanded. */
  open: boolean;
}

export default function AppNavSidebar({ open }: AppNavSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();

  // ── Shared width transition ────────────────────────────────────────────
  // Applied to both the Drawer root and its Paper so they animate together.
  const widthTransition = theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: open
      ? theme.transitions.duration.enteringScreen
      : theme.transitions.duration.leavingScreen,
  });

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : miniDrawerWidth,
        flexShrink: 0,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        overflowX: "hidden",
        transition: widthTransition,
        [`& .MuiDrawer-paper`]: {
          width: open ? drawerWidth : miniDrawerWidth,
          boxSizing: "border-box",
          backgroundColor: "background.paper",
          borderRight: 1,
          borderColor: "divider",
          overflowX: "hidden",
          transition: widthTransition,
        },
      }}
    >
      {/* ── Header: logo + click-to-home ───────────────────────────────── */}
      <SidebarHeader open={open} onHome={() => router.push("/")} />

      {/* ── Nav list: all route links ───────────────────────────────────── */}
      <SidebarNavList
        open={open}
        pathname={pathname}
        onNavigate={(href) => router.push(href)}
      />
    </Drawer>
  );
}
