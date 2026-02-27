"use client";

/**
 * UserMenu — authenticated user avatar with a sign-out dropdown
 *
 * Renders two possible states:
 *  1. Authenticated  → circular avatar (photo or initial letter) with a
 *     dropdown menu showing the user's display name and a "Sign out" action.
 *  2. Unauthenticated → plain "Sign in" text button that navigates to /sign-in.
 *
 * Sign-out flow:
 *  1. Close the dropdown immediately (avoids stale open state).
 *  2. Call `signOut()` from AuthContext (clears session cookie + Firebase).
 *  3. Redirect to /sign-in.
 *
 * ── Props ─────────────────────────────────────────────────────────────────
 *  No external props — reads user state from AuthContext directly.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  // null = menu closed; HTMLElement = the avatar button (anchor for the popover)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    // 1. Close menu first so it doesn't linger during async signOut
    handleMenuClose();
    // 2. Clear Firebase session + server-side cookie
    await signOut();
    // 3. Redirect to sign-in page
    router.push("/sign-in");
  };

  // ── Unauthenticated state ──────────────────────────────────────────────
  if (!user) {
    return (
      <Button
        color="inherit"
        onClick={() => router.push("/sign-in")}
        sx={{ ml: 1 }}
      >
        {t("auth.signIn")}
      </Button>
    );
  }

  // ── Authenticated state ────────────────────────────────────────────────
  return (
    <Box>
      {/* Avatar button — opens the dropdown menu */}
      <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
        <Avatar
          src={user.photoURL ?? undefined}
          alt={user.displayName ?? undefined}
          sx={{ width: 32, height: 32 }}
        >
          {/* Fallback initial letter when no photo is available */}
          {user.displayName?.[0]?.toUpperCase()}
        </Avatar>
      </IconButton>

      {/* Dropdown menu anchored to the avatar button */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {/* Read-only display name row — disabled so it is not clickable */}
        <MenuItem disabled>
          <Typography variant="body2">{user.displayName}</Typography>
        </MenuItem>

        {/* Sign-out action */}
        <MenuItem onClick={handleSignOut}>{t("common.signOut")}</MenuItem>
      </Menu>
    </Box>
  );
}
