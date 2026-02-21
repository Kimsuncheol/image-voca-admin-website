"use client";

import { usePathname, useRouter } from "next/navigation";
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

export default function AppNavSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

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

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "background.paper",
          borderRight: 1,
          borderColor: "divider",
        },
      }}
    >
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
          sx={{ cursor: "pointer", textAlign: "center" }}
          onClick={() => router.push("/")}
        >
          Image Voca
        </Typography>
      </Box>
      <Box sx={{ overflow: "auto", mt: 2 }}>
        <List sx={{ px: 2 }}>
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
                      minWidth: 40,
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
