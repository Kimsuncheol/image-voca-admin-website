"use client";

import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import PageLayout from "@/components/layout/PageLayout";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <PageLayout>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          textAlign: "center",
        }}
      >
        <Typography variant="h1" fontWeight={700} color="primary" gutterBottom>
          {t("notFound.title", "404")}
        </Typography>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          {t("notFound.heading", "Page Not Found")}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: "500px" }}
        >
          {t(
            "notFound.description",
            "Sorry, the page you are looking for does not exist or has been moved.",
          )}
        </Typography>
        <Button variant="contained" component={Link} href="/" size="large">
          {t("notFound.backHome", "Back to Home")}
        </Button>
      </Box>
    </PageLayout>
  );
}
