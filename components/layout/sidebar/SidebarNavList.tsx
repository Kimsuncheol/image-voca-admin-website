"use client";

/**
 * SidebarNavList — scrollable list of all sidebar navigation items
 *
 * Iterates over the nav item definitions returned by `useNavItems()` and
 * renders a `<SidebarNavItem>` for each entry.  Active-state detection
 * (prefix-match for nested routes, exact-match for "/") is centralised here
 * so that `SidebarNavItem` stays purely presentational.
 *
 * ── Props ─────────────────────────────────────────────────────────────────
 *  open      — whether the sidebar is expanded (forwarded to each item)
 *  pathname  — current Next.js pathname used to compute active state
 *  onNavigate — called with the target href when the user clicks an item
 */

import Box from "@mui/material/Box";
import List from "@mui/material/List";
import { useNavItems } from "./navItems";
import SidebarNavItem from "./SidebarNavItem";

interface SidebarNavListProps {
  /** Whether the sidebar is expanded. Forwarded to each nav item for layout. */
  open: boolean;
  /** Current URL pathname from `usePathname()`. Used to highlight the active item. */
  pathname: string;
  /** Called with the href to navigate to when the user clicks an item. */
  onNavigate: (href: string) => void;
}

export default function SidebarNavList({
  open,
  pathname,
  onNavigate,
}: SidebarNavListProps) {
  const navItems = useNavItems();

  return (
    // Outer box provides independent Y-scroll without horizontal overflow
    <Box sx={{ overflowX: "hidden", overflowY: "auto", mt: 2 }}>
      {/* Horizontal padding shrinks when collapsed to keep icons centred */}
      <List sx={{ px: open ? 2 : 1 }}>
        {navItems.map((item) => {
          // "/" must be an exact match; nested routes use prefix matching
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));

          return (
            <SidebarNavItem
              key={item.href}
              item={item}
              open={open}
              isActive={isActive}
              onClick={() => onNavigate(item.href)}
            />
          );
        })}
      </List>
    </Box>
  );
}
