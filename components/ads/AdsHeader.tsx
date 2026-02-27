"use client";

import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTranslation } from "react-i18next";

interface AdsHeaderProps {
  onRefresh: () => void;
  onAddClick: () => void;
  loading?: boolean;
}

export default function AdsHeader({
  onRefresh,
  onAddClick,
  loading,
}: AdsHeaderProps) {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 3,
      }}
    >
      <Typography variant="h4" fontWeight={600}>
        {t("ads.title")}
      </Typography>

      <Box sx={{ display: "flex", gap: 1 }}>
        {/* Refresh: re-fetches ads from Firestore */}
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          disabled={loading}
        >
          {t("ads.refresh")}
        </Button>

        {/* Add Ad: opens the AddAdModal creation form */}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddClick}
        >
          {t("ads.addAd")}
        </Button>
      </Box>
    </Box>
  );
}
