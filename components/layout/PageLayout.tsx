"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import AppNav from "./AppNav";
import AppNavSidebar from "./AppNavSidebar";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Sidebar open/close state ───────────────────────────────────────────
  // Initialise from localStorage so the preference survives page navigation.
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("sidebar-open");
    return stored === null ? false : stored === "true";
  });

  const toggleDrawer = () =>
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-open", String(next));
      return next;
    });

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "row",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      {/* ── Collapsible sidebar ─────────────────────────────────────────── */}
      <AppNavSidebar open={open} />

      {/* ── Main content area ───────────────────────────────────────────── */}
      <Box
        sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
      >
        <AppNav open={open} onToggle={toggleDrawer} />
        <Container
          maxWidth="lg"
          sx={{ flex: 1, py: 3, display: "flex", flexDirection: "column" }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
}
