"use client";

/**
 * AppNav  —  sticky top AppBar
 *
 * Thin orchestrator: owns the AppBar/Toolbar shell and delegates each
 * functional section to a focused sub-component.
 *
 * ── Sub-components ────────────────────────────────────────────────────────
 *  navbar/SidebarToggleButton — hamburger / chevron-left icon button
 *  navbar/UserMenu            — avatar + sign-out dropdown (or sign-in link)
 *  ThemeToggle                — light/dark mode switcher
 *  LanguageToggle             — language switcher
 *
 * ── Related files ─────────────────────────────────────────────────────────
 *  components/layout/AppNavSidebar.tsx — the collapsible sidebar drawer
 */

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import SidebarToggleButton from "./navbar/SidebarToggleButton";
import UserMenu from "./navbar/UserMenu";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";

interface AppNavProps {
  /** Whether the sidebar is currently expanded. Used by the toggle button icon. */
  open: boolean;
  /** Callback to flip the sidebar open/closed state in the parent layout. */
  onToggle: () => void;
}

export default function AppNav({ open, onToggle }: AppNavProps) {
  return (
    <AppBar
      position="sticky"
      sx={{
        top: 0,
        width: "100%",
      }}
    >
      <Toolbar>
        {/* ── Left: sidebar toggle ────────────────────────────────────── */}
        <SidebarToggleButton open={open} onToggle={onToggle} />

        {/* ── Centre spacer: pushes right-side actions to the far right ─ */}
        <Box sx={{ flexGrow: 1 }} />

        {/* ── Right: theme, language, user ────────────────────────────── */}
        <ThemeToggle />
        <LanguageToggle />
        <UserMenu />
      </Toolbar>
    </AppBar>
  );
}
