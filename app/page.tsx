"use client";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import PostAddIcon from "@mui/icons-material/PostAdd";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PeopleIcon from "@mui/icons-material/People";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { useTranslation } from "react-i18next";
import PageLayout from "@/components/layout/PageLayout";
import NavCard from "@/components/dashboard/NavCard";

export default function Home() {
  const { t } = useTranslation();

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
  ];

  return (
    <PageLayout>
      <Typography variant="h4" gutterBottom fontWeight={600} sx={{ mb: 4 }}>
        {t("dashboard.title")}
      </Typography>
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
