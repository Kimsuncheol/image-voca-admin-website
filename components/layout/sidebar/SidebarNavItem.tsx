"use client";

/**
 * SidebarNavItem — a single row in the sidebar navigation list
 *
 * Handles:
 *  - Active-state highlighting (background tint + bold text + primary colour)
 *  - Collapsed / expanded layout (icon centred vs. icon + label)
 *  - Smooth opacity transition for the label text when the sidebar toggles
 *
 * ── Props ─────────────────────────────────────────────────────────────────
 *  item      — the nav entry to render (title, icon, href)
 *  open      — whether the sidebar is expanded
 *  isActive  — whether this item matches the current route
 *  onClick   — callback when the item is clicked (usually router.push)
 */

import { useTheme } from "@mui/material/styles";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { NavItem } from "./navItems";

interface SidebarNavItemProps {
  item: NavItem;
  /** Whether the sidebar is currently expanded. Controls layout & label opacity. */
  open: boolean;
  /** Whether this item is the currently active route. */
  isActive: boolean;
  /** Called when the user clicks the item. */
  onClick: () => void;
}

export default function SidebarNavItem({
  item,
  open,
  isActive,
  onClick,
}: SidebarNavItemProps) {
  const theme = useTheme();

  return (
    <ListItem disablePadding sx={{ mb: 1 }}>
      <ListItemButton
        selected={isActive}
        onClick={onClick}
        sx={{
          borderRadius: 2,
          // Centre the icon when collapsed, left-align when expanded
          justifyContent: open ? "initial" : "center",
          px: open ? 2 : 2.5,
          // Active-state: subtle primary-colour background tint
          ...(isActive && {
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(144, 202, 249, 0.16)"
                : "rgba(25, 118, 210, 0.08)",
            color: "primary.main",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(144, 202, 249, 0.24)"
                  : "rgba(25, 118, 210, 0.12)",
            },
          }),
        }}
      >
        {/* Icon — mr collapses to "auto" under justify-content:center */}
        <ListItemIcon
          sx={{
            minWidth: 0,
            mr: open ? 2 : "auto",
            justifyContent: "center",
            color: isActive ? "primary.main" : "text.secondary",
          }}
        >
          {item.icon}
        </ListItemIcon>

        {/* Label — fades out when collapsed to avoid text clipping artefacts */}
        <ListItemText
          primary={item.title}
          primaryTypographyProps={{
            fontWeight: isActive ? 600 : 500,
            color: isActive ? "primary.main" : "text.primary",
            fontSize: "0.95rem",
          }}
          sx={{
            opacity: open ? 1 : 0,
            transition: theme.transitions.create("opacity", {
              duration: open
                ? theme.transitions.duration.enteringScreen
                : theme.transitions.duration.leavingScreen,
            }),
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}
