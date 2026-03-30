"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import { useAdminGuard } from "@/hooks/useAdminGuard";

import ParenthesesForm from "./ParenthesesForm";

type TabIndex = 0 | 1;

export default function ParenthesesToolPage() {
  const { t } = useTranslation();
  const { user, authLoading } = useAdminGuard();

  const [tab, setTab] = useState<TabIndex>(0);

  if (authLoading) return null;
  if (user?.role !== "admin" && user?.role !== "super-admin") return null;

  const sharedFormProps = {
    loadingLabel: t("parenthesesTool.loading"),
    resetLabel: t("parenthesesTool.resetAction"),
    inputLabel: t("parenthesesTool.inputLabel"),
    outputLabel: t("parenthesesTool.outputLabel"),
    inputRequiredMsg: t("parenthesesTool.inputRequired"),
    networkErrorMsg: t("parenthesesTool.networkError"),
  };

  return (
    <PageLayout>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {t("parenthesesTool.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("parenthesesTool.description")}
          </Typography>
        </Box>

        <Card>
          <Tabs
            value={tab}
            onChange={(_, value: TabIndex) => setTab(value)}
            sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
          >
            <Tab label={t("parenthesesTool.tabGeneration")} />
            <Tab label={t("parenthesesTool.tabRemoval")} />
          </Tabs>

          <CardContent>
            {tab === 0 && (
              <ParenthesesForm
                apiPath="/api/text/generate-parentheses"
                submitLabel={t("parenthesesTool.generateAction")}
                {...sharedFormProps}
              />
            )}
            {tab === 1 && (
              <ParenthesesForm
                apiPath="/api/text/remove-parentheses"
                submitLabel={t("parenthesesTool.removeAction")}
                {...sharedFormProps}
              />
            )}
          </CardContent>
        </Card>
      </Stack>
    </PageLayout>
  );
}
