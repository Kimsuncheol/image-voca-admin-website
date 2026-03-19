"use client";

import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import PageLayout from "@/components/layout/PageLayout";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HomeIcon from "@mui/icons-material/Home";

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
          px: 3,
        }}
      >
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={3}
          sx={{
            py: 8,
            px: 6,
            borderRadius: 4,
            border: "1px dashed",
            borderColor: "divider",
            backgroundColor: "action.hover",
            maxWidth: 500,
            width: "100%",
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 80, color: "text.disabled", opacity: 0.6 }} />
          
          <Stack alignItems="center" spacing={1}>
            <Typography variant="h3" fontWeight={700} color="text.primary">
              {t("notFound.title", "404")}
            </Typography>
            <Typography variant="h5" fontWeight={600} color="text.secondary">
              {t("notFound.heading", "Page Not Found")}
            </Typography>
          </Stack>
          
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: "400px" }}
          >
            {t(
              "notFound.description",
              "Sorry, the page you are looking for does not exist or has been moved.",
            )}
          </Typography>
          
          <Button 
            variant="contained" 
            component={Link} 
            href="/" 
            size="large"
            startIcon={<HomeIcon />}
            sx={{ mt: 2, borderRadius: 2 }}
          >
            {t("notFound.backHome", "Back to Home")}
          </Button>
        </Stack>
      </Box>
    </PageLayout>
  );
}
