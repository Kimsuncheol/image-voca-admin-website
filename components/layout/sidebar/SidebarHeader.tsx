"use client";

/**
 * SidebarHeader — top section of the sidebar drawer
 *
 * Two states based on `open`:
 *  - Expanded  → "Image Voca" text label (fades in)
 *  - Collapsed → icon.png app icon (fades in), label fades out
 *
 * Both elements are always mounted so transitions are smooth with no
 * layout shift; only their opacity is toggled.
 *
 * ── Props ─────────────────────────────────────────────────────────────────
 *  open     — whether the sidebar is currently expanded
 *  onHome   — callback invoked when the user clicks the logo (navigate home)
 */

import Image from "next/image";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import icon from "@/public/icon.png";

interface SidebarHeaderProps {
  /** Whether the sidebar is currently expanded. Controls which logo is visible. */
  open: boolean;
  /** Called when the user clicks either logo element to navigate to "/". */
  onHome: () => void;
}

export default function SidebarHeader({ open, onHome }: SidebarHeaderProps) {
  const theme = useTheme();

  // Reusable transition for fading both elements in sync with the drawer animation
  const fadeDuration = open
    ? theme.transitions.duration.enteringScreen
    : theme.transitions.duration.leavingScreen;

  const fadeTransition = theme.transitions.create("opacity", {
    duration: fadeDuration,
  });

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderBottom: 1,
        borderColor: "divider",
        minHeight: 64,
        backgroundColor: "background.paper.main",
        // Relative so the two absolutely-positioned layers stack correctly
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        px: 2,
      }}
      onClick={onHome}
    >
      {/* ── Collapsed state: app icon ──────────────────────────────────── */}
      {/* Fades in when sidebar is collapsed, fades out when expanded      */}
      <Box
        sx={{
          opacity: open ? 0 : 1,
          transition: fadeTransition,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          flexShrink: 0,
        }}
      >
        <Image
          src={icon}
          alt="Image Voca icon"
          width={36}
          height={36}
          style={{ objectFit: "contain" }}
          priority
        />
      </Box>

      {/* ── Expanded state: text label ─────────────────────────────────── */}
      {/* Fades in when sidebar is expanded, fades out when collapsed      */}
      <Typography
        variant="h6"
        fontWeight="bold"
        color="primary.title"
        sx={{
          position: "absolute",
          whiteSpace: "nowrap",
          opacity: open ? 1 : 0,
          transition: fadeTransition,
          // Block clicks on the text when it's hidden so it doesn't interfere
          pointerEvents: open ? "auto" : "none",
        }}
      >
        Image Voca
      </Typography>
    </Box>
  );
}
