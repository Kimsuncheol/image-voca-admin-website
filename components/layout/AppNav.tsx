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
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import SidebarToggleButton from "./navbar/SidebarToggleButton";
import UserMenu from "./navbar/UserMenu";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import { useNotifications } from "@/lib/hooks/useNotifications";

interface AppNavProps {
  /** Whether the sidebar is currently expanded. Used by the toggle button icon. */
  open: boolean;
  /** Callback to flip the sidebar open/closed state in the parent layout. */
  onToggle: () => void;
}

export default function AppNav({ open, onToggle }: AppNavProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

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
        <Tooltip title={t("notifications.title")}>
          <IconButton
            color="inherit"
            onClick={() => router.push("/notifications")}
            sx={{
              mr: 0.5,
              color: pathname === "/notifications" ? "warning.light" : "inherit",
            }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        <ThemeToggle />
        <LanguageToggle />
        <UserMenu />
      </Toolbar>
    </AppBar>
  );
}
