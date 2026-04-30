"use client";

import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import QuizGeneratorForm from "@/app/quiz-generator/QuizGeneratorForm";

export default function PopQuizPage() {
  const { t } = useTranslation();
  const { user, authLoading } = useAdminGuard();

  if (authLoading) return null;
  if (user?.role !== "admin" && user?.role !== "super-admin") return null;

  return (
    <PageLayout>
      <Typography variant="h4" gutterBottom fontWeight={600} sx={{ mb: 1 }}>
        {t("popQuiz.title")}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t("popQuiz.description")}
      </Typography>
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
    </PageLayout>
  );
}
