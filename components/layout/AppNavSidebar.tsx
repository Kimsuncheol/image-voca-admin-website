"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PostAddIcon from "@mui/icons-material/PostAdd";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PeopleIcon from "@mui/icons-material/People";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { useTranslation } from "react-i18next";

const drawerWidth = 260;
const miniDrawerWidth = 64;

interface AppNavSidebarProps {
  open: boolean;
}

export default function AppNavSidebar({ open }: AppNavSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const theme = useTheme();

  const navItems = [
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
      title: t("dashboard.userManagement", "Users"),
      icon: <PeopleIcon />,
      href: "/users",
    },
    {
      title: t("dashboard.ads", "Ads"),
      icon: <OndemandVideoIcon />,
      href: "/ads",
    },
    {
      title: t("dashboard.promotionCodes", "Promotion Codes"),
      icon: <LocalOfferIcon />,
      href: "/promotion-codes",
    },
  ];

  // ── Shared width transition ────────────────────────────────────────────
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
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: 1,
          borderColor: "divider",
          minHeight: 64,
          backgroundColor: "background.paper.main",
        }}
      >
        <Typography
          variant="h6"
          fontWeight="bold"
          color="primary.title"
          sx={{
            cursor: "pointer",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            opacity: open ? 1 : 0,
            transition: theme.transitions.create("opacity", {
              duration: open
                ? theme.transitions.duration.enteringScreen
                : theme.transitions.duration.leavingScreen,
            }),
          }}
          onClick={() => router.push("/")}
        >
          Image Voca
        </Typography>
      </Box>

      {/* ── Nav list ──────────────────────────────────────────────────────── */}
      <Box sx={{ overflowX: "hidden", overflowY: "auto", mt: 2 }}>
        <List sx={{ px: open ? 2 : 1 }}>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <ListItem key={item.href} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => router.push(item.href)}
                  sx={{
                    borderRadius: 2,
                    // Centre the icon when collapsed, left-align when expanded
                    justifyContent: open ? "initial" : "center",
                    px: open ? 2 : 2.5,
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
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      // mr: "auto" collapses to 0 under justify-content:center
                      mr: open ? 2 : "auto",
                      justifyContent: "center",
                      color: isActive ? "primary.main" : "text.secondary",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
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
          })}
        </List>
      </Box>
    </Drawer>
  );
}
