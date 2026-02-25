"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";

interface AppNavProps {
  open: boolean;
  onToggle: () => void;
}

export default function AppNav({ open, onToggle }: AppNavProps) {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    handleMenuClose();
    await signOut();
    router.push("/sign-in");
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        top: 0,
        width: "100%",
      }}
    >
      <Toolbar>
        {/* ── Drawer toggle: hamburger when closed, chevron-left when open ── */}
        <IconButton
          onClick={onToggle}
          edge="start"
          color="inherit"
          aria-label={open ? "collapse sidebar" : "expand sidebar"}
          sx={{ mr: 1 }}
        >
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>

        <Box sx={{ flexGrow: 1 }} />
        <ThemeToggle />
        <LanguageToggle />
        {user ? (
          <>
            <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
              <Avatar
                src={user.photoURL}
                alt={user.displayName}
                sx={{ width: 32, height: 32 }}
              >
                {user.displayName?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem disabled>
                <Typography variant="body2">{user.displayName}</Typography>
              </MenuItem>
              <MenuItem onClick={handleSignOut}>{t("common.signOut")}</MenuItem>
            </Menu>
          </>
        ) : (
          <Button
            color="inherit"
            onClick={() => router.push("/sign-in")}
            sx={{ ml: 1 }}
          >
            {t("auth.signIn")}
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
