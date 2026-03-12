"use client";

import Link from "next/link";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

export default function NotificationDetailBreadcrumbs() {
  const { t } = useTranslation();

  return (
    <Breadcrumbs>
      <Link
        href="/notifications"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {t("notifications.backToNotifications")}
      </Link>
      <Typography color="text.primary">
        {t("notifications.notificationDetails")}
      </Typography>
    </Breadcrumbs>
  );
}
