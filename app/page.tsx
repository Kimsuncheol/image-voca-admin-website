"use client";

/**
 * HomePage  —  /
 *
 * Dashboard landing page for the admin panel.
 * Renders a responsive grid of navigation cards, one per admin feature section.
 * No async data fetching is needed here — all content is statically defined.
 *
 * ── Navigation targets ────────────────────────────────────────────────
 *  /add-voca        — upload new vocabulary days via CSV or Google Sheets URL
 *  /courses         — browse and inspect uploaded course content
 *  /users           — manage user accounts, roles, and subscription plans
 *  /ads             — create and toggle in-app advertisements
 *  /promotion-codes — generate and manage promotional discount codes
 *
 * ── Child components ──────────────────────────────────────────────────
 *  NavCard  — single tile with icon, title, description, and a Next.js Link
 */

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import PostAddIcon from "@mui/icons-material/PostAdd";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SearchIcon from "@mui/icons-material/Search";
import ApiIcon from "@mui/icons-material/Api";
import PeopleIcon from "@mui/icons-material/People";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SettingsIcon from "@mui/icons-material/Settings";
import { useTranslation } from "react-i18next";

// ── Layout ────────────────────────────────────────────────────────────
import PageLayout from "@/components/layout/PageLayout";

// ── Feature component ─────────────────────────────────────────────────
import NavCard from "@/components/dashboard/NavCard";

export default function Home() {
  const { t } = useTranslation();

  // ── Navigation items ───────────────────────────────────────────────
  // Each item maps to one top-level admin section. The icon, title, and
  // description are all i18n-keyed so they render correctly in EN and KO.
  const navItems = [
    {
      title: t("dashboard.addVoca"),
      description: t("dashboard.addVocaDesc"),
      icon: <PostAddIcon />,
      href: "/add-voca",
    },
    {
      title: t("dashboard.courses"),
      description: t("dashboard.coursesDesc"),
      icon: <MenuBookIcon />,
      href: "/courses",
    },
    {
      title: t("dashboard.wordFinder"),
      description: t("dashboard.wordFinderDesc"),
      icon: <SearchIcon />,
      href: "/words",
    },
    {
      title: t("dashboard.naverDictApi"),
      description: t("dashboard.naverDictApiDesc"),
      icon: <ApiIcon />,
      href: "/naver-dict",
    },
    {
      title: t("dashboard.userManagement"),
      description: t("dashboard.userManagementDesc"),
      icon: <PeopleIcon />,
      href: "/users",
    },
    {
      title: t("dashboard.ads"),
      description: t("dashboard.adsDesc"),
      icon: <OndemandVideoIcon />,
      href: "/ads",
    },
    {
      title: t("dashboard.promotionCodes"),
      description: t("dashboard.promotionCodesDesc"),
      icon: <LocalOfferIcon />,
      href: "/promotion-codes",
    },
    {
      title: t("dashboard.parenthesesTool"),
      description: t("dashboard.parenthesesToolDesc"),
      icon: <AutoFixHighIcon />,
      href: "/parentheses-generation-removal",
    },
    {
      title: t("dashboard.settings"),
      description: t("dashboard.settingsDesc"),
      icon: <SettingsIcon />,
      href: "/settings",
    },
  ];

  return (
    <PageLayout>
      {/* ── Page heading ─────────────────────────────────────────────── */}
      <Typography variant="h4" gutterBottom fontWeight={600} sx={{ mb: 4 }}>
        {t("dashboard.title")}
      </Typography>

      {/* ── Nav card grid ─────────────────────────────────────────────── */}
      {/*
       * Responsive breakpoints:
       *   xs=12 → single column on mobile (stacked)
       *   sm=6  → two columns on tablet
       *   md=3  → four columns on desktop
       */}
      <Grid container spacing={3}>
        {navItems.map((item) => (
          <Grid key={item.href} size={{ xs: 12, sm: 6, md: 3 }}>
            <NavCard {...item} />
          </Grid>
        ))}
      </Grid>
    </PageLayout>
  );
}
