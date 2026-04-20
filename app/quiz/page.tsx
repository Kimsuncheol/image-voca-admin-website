"use client";

import { useState } from "react";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import QuizGeneratorForm from "@/app/quiz-generator/QuizGeneratorForm";
import QuizReviewTab from "./QuizReviewTab";

export default function QuizPage() {
  const { t } = useTranslation();
  const { user, authLoading } = useAdminGuard();
  const [tab, setTab] = useState(0);

  if (authLoading) return null;
  if (user?.role !== "admin" && user?.role !== "super-admin") return null;

  return (
    <PageLayout>
      <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
        {t("quiz.title")}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {t("quiz.description")}
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v: number) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label={t("quiz.generatorTab")} />
        <Tab label={t("quiz.reviewTab")} />
      </Tabs>

      <Box hidden={tab !== 0}>
        <QuizGeneratorForm
          submitLabel={t("quizGenerator.submitLabel")}
          loadingLabel={t("quizGenerator.loading")}
          resetLabel={t("quizGenerator.reset")}
          networkErrorMsg={t("quizGenerator.networkError")}
          standbyTitle={t("quizGenerator.standbyTitle")}
          standbyDescription={t("quizGenerator.standbyDescription")}
          processingDescription={t("quizGenerator.processingDescription")}
          quizTypeLabel={t("quizGenerator.quizTypeLabel")}
          languageLabel={t("quizGenerator.languageLabel")}
          courseLabel={t("quizGenerator.courseLabel")}
          levelLabel={t("quizGenerator.levelLabel")}
          dayLabel={t("quizGenerator.dayLabel")}
          countLabel={t("quizGenerator.countLabel")}
          matchingLabel={t("quizGenerator.matching")}
          fillBlankLabel={t("quizGenerator.fillBlank")}
          englishLabel={t("quizGenerator.english")}
          japaneseLabel={t("quizGenerator.japanese")}
          itemsLabel={t("quizGenerator.items")}
          choicesLabel={t("quizGenerator.choices")}
          answerKeyLabel={t("quizGenerator.answerKey")}
          questionLabel={t("quizGenerator.question")}
          showAnswerLabel={t("quizGenerator.showAnswer")}
          hideAnswerLabel={t("quizGenerator.hideAnswer")}
          meaningEnglishLabel={t("quizGenerator.meaningEnglish")}
          meaningKoreanLabel={t("quizGenerator.meaningKorean")}
          addLabel={t("quizGenerator.add")}
          addingLabel={t("quizGenerator.adding")}
          addSuccessMsg={t("quizGenerator.addSuccess")}
          addErrorMsg={t("quizGenerator.addError")}
        />
      </Box>

      {tab === 1 && <QuizReviewTab />}
    </PageLayout>
  );
}
