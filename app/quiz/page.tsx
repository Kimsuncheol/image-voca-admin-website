"use client";

import { useState } from "react";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import QuizGeneratorForm from "@/app/quiz-generator/QuizGeneratorForm";
import QuizReviewTab from "./QuizReviewTab";

export default function QuizPage() {
  const { t } = useTranslation();
  const { user, authLoading } = useAdminGuard();
  const [section, setSection] = useState<"quiz" | "pop_quiz">("quiz");
  const [mode, setMode] = useState<"generator" | "review">("generator");

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
        value={section}
        onChange={(_, value: "quiz" | "pop_quiz") => {
          setSection(value);
          setMode("generator");
        }}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab value="quiz" label={t("quiz.title")} />
        <Tab value="pop_quiz" label={t("popQuiz.title")} />
      </Tabs>

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Chip
          label={t("quiz.generatorTab")}
          color={mode === "generator" ? "primary" : "default"}
          variant={mode === "generator" ? "filled" : "outlined"}
          onClick={() => setMode("generator")}
          clickable
        />
        <Chip
          label={t("quiz.reviewTab")}
          color={mode === "review" ? "primary" : "default"}
          variant={mode === "review" ? "filled" : "outlined"}
          onClick={() => setMode("review")}
          clickable
        />
      </Stack>

      {section === "quiz" && mode === "generator" && (
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
      )}

      {section === "quiz" && mode === "review" && <QuizReviewTab />}

      {section === "pop_quiz" && mode === "generator" && (
        <QuizGeneratorForm
          fixedQuizType="matching"
          hideQuizTypeSelector
          saveTarget="pop_quiz"
          submitLabel={t("popQuiz.submitLabel")}
          loadingLabel={t("quizGenerator.loading")}
          resetLabel={t("quizGenerator.reset")}
          networkErrorMsg={t("quizGenerator.networkError")}
          standbyTitle={t("popQuiz.standbyTitle")}
          standbyDescription={t("popQuiz.standbyDescription")}
          processingDescription={t("popQuiz.processingDescription")}
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
      )}

      {section === "pop_quiz" && mode === "review" && (
        <QuizReviewTab
          saveTarget="pop_quiz"
          fixedQuizType="matching"
          hideQuizTypeSelector
        />
      )}
    </PageLayout>
  );
}
