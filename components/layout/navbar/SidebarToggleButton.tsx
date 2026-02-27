"use client";

/**
 * SidebarToggleButton — hamburger / chevron-left icon button
 *
 * Placed at the left edge of the top AppBar.  Displays a hamburger icon
 * when the sidebar is collapsed, and a left-chevron when it is expanded,
 * giving the user a clear affordance for toggling the drawer.
 *
 * ── Props ─────────────────────────────────────────────────────────────────
 *  open     — current sidebar state (controls which icon is shown)
 *  onToggle — callback that flips the sidebar open/closed in the parent
 */

import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

interface SidebarToggleButtonProps {
  /** Whether the sidebar is currently open. Determines the displayed icon. */
  open: boolean;
  /** Invoked when the user clicks the button to toggle the sidebar. */
  onToggle: () => void;
}

export default function SidebarToggleButton({
  open,
  onToggle,
}: SidebarToggleButtonProps) {
  return (
    <IconButton
      onClick={onToggle}
      edge="start"
      color="inherit"
      // Descriptive aria-label so screen readers announce the action correctly
      aria-label={open ? "collapse sidebar" : "expand sidebar"}
      sx={{ mr: 1 }}
    >
      {/* Swap icon depending on sidebar state */}
      {open ? <ChevronLeftIcon /> : <MenuIcon />}
    </IconButton>
  );
}
