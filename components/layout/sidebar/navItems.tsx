/**
 * navItems.ts — Sidebar navigation item definitions
 *
 * Pure data layer: no JSX, no side-effects.
 * Import `useNavItems()` in any component that needs the nav list so that
 * the list is always built with the currently active i18n translations.
 *
 * ── Adding a new route ────────────────────────────────────────────────────
 * 1. Import the MUI icon you need from `@mui/icons-material`.
 * 2. Add a new object to the array returned by `useNavItems`.
 * 3. Add the matching i18n key to your translation files.
 */

import { ReactNode } from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PostAddIcon from "@mui/icons-material/PostAdd";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SearchIcon from "@mui/icons-material/Search";
import PeopleIcon from "@mui/icons-material/People";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import SettingsIcon from "@mui/icons-material/Settings";
import QuizIcon from "@mui/icons-material/Quiz";
import { useTranslation } from "react-i18next";

/** Shape of a single sidebar navigation entry. */
export interface NavItem {
  /** Display label (translated). */
  title: string;
  /** MUI icon element rendered in the list item icon slot. */
  icon: ReactNode;
  /** Next.js route path this item navigates to. */
  href: string;
}

/**
 * `useNavItems` — hook that returns the full list of sidebar nav items.
 *
 * Implemented as a hook (not a plain constant) so that each item's `title`
 * is derived from the live i18n translation, which may change at runtime
 * when the user switches language.
 */
export function useNavItems(): NavItem[] {
  const { t } = useTranslation();

  return [
    {
      title: t("dashboard.title", "Dashboard"),
      icon: <DashboardIcon />,
      href: "/",
    },
    {
      title: t("dashboard.addVoca", "Add Voca"),
      icon: <PostAddIcon />,
      href: "/add-voca",
    },
    {
      title: t("dashboard.courses", "Courses"),
      icon: <MenuBookIcon />,
      href: "/courses",
    },
    {
      title: t("dashboard.textTools", "Text Tools"),
      icon: <AutoFixHighIcon />,
      href: "/text-tools",
    },
    {
      title: t("dashboard.quiz", "Quiz"),
      icon: <QuizIcon />,
      href: "/quiz",
    },
    {
      title: t("dashboard.popQuiz", "Pop Quiz"),
      icon: <QuizIcon />,
      href: "/pop-quiz",
    },
    {
      title: t("dashboard.wordFinder", "Word Finder"),
      icon: <SearchIcon />,
      href: "/words",
    },
    {
      title: t("dashboard.userManagement", "Users"),
      icon: <PeopleIcon />,
      href: "/users",
    },
    {
      title: t("manga.title", "Manga"),
      icon: <AutoStoriesIcon />,
      href: "/manga",
    },
    {
      title: t("settings.title", "Settings"),
      icon: <SettingsIcon />,
      href: "/settings",
    },
  ];
}
