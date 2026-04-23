"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import { useAdminGuard } from "@/hooks/useAdminGuard";

import ParenthesesForm from "./ParenthesesForm";
import VocabExtractForm from "./VocabExtractForm";
import VocabularyBatchLookup from "./VocabularyBatchLookup";

type ToolGroup =
  | "parentheses"
  | "romanize"
  | "furigana"
  | "vocabulary"
  | "vocabExtract"
  | "removeEqualSign";
type ParenthesesAction = "generate" | "remove";
type FuriganaAction = "add" | "remove";
type RemoveSide = "left" | "right";
type RomanizeLanguage = "ja" | "ko";

const PARENTHESES_REGEX = /[()（）[\]【】〔〕「」『』〈〉《》〖〗｛｝]/;
const OTHER_LANGUAGE_REGEX = /[a-zA-Z\uAC00-\uD7A3]/;
const LATIN_REGEX = /[a-zA-Z]/;
const SPLITTER_REGEX = /[=\-:;,./()\[\]*"']/;

export default function TextToolsPage() {
  const { t } = useTranslation();
  const { user, authLoading } = useAdminGuard();

  const [group, setGroup] = useState<ToolGroup>("vocabExtract");
  const [parenthesesAction, setParenthesesAction] =
    useState<ParenthesesAction>("generate");
  const [furiganaAction, setFuriganaAction] = useState<FuriganaAction>("add");
  const [removeSide, setRemoveSide] = useState<RemoveSide>("left");
  const [romanizeLanguage, setRomanizeLanguage] =
    useState<RomanizeLanguage>("ja");

  if (authLoading) return null;
  if (user?.role !== "admin" && user?.role !== "super-admin") return null;

  const sharedFormProps = {
    loadingLabel: t("textTools.loading"),
    resetLabel: t("textTools.resetAction"),
    inputLabel: t("textTools.inputLabel"),
    outputLabel: t("textTools.outputLabel"),
    inputRequiredMsg: t("textTools.inputRequired"),
    networkErrorMsg: t("textTools.networkError"),
  };

  function renderActionChips<TAction extends string>({
    actions,
    current,
    onSelect,
  }: {
    actions: Array<{ value: TAction; label: string }>;
    current: TAction;
    onSelect: (value: TAction) => void;
  }) {
    return (
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {actions.map((action) => {
          const selected = action.value === current;

          return (
            <Chip
              key={action.value}
              label={action.label}
              clickable
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              onClick={() => onSelect(action.value)}
              sx={{
                borderRadius: 999,
                fontWeight: selected ? 600 : 500,
                px: 0.5,
                height: 36,
                bgcolor: selected ? undefined : "background.paper",
                borderColor: selected ? "primary.main" : "divider",
              }}
            />
          );
        })}
      </Stack>
    );
  }

  function renderCurrentForm() {
    if (group === "parentheses") {
      return (
        <Stack spacing={2}>
          {renderActionChips<ParenthesesAction>({
            actions: [
              { value: "generate", label: t("textTools.subtabGenerate") },
              { value: "remove", label: t("textTools.subtabRemove") },
            ],
            current: parenthesesAction,
            onSelect: setParenthesesAction,
          })}

          <ParenthesesForm
            key={group + parenthesesAction}
            horizontal
            apiPath={
              parenthesesAction === "generate"
                ? "/api/text/generate-parentheses"
                : "/api/text/remove-parentheses"
            }
            submitLabel={
              parenthesesAction === "generate"
                ? t("textTools.generateAction")
                : t("textTools.removeAction")
            }
            validate={
              parenthesesAction === "remove"
                ? (text) =>
                    PARENTHESES_REGEX.test(text)
                      ? null
                      : t("textTools.inputNoParentheses")
                : (text) =>
                    PARENTHESES_REGEX.test(text)
                      ? t("textTools.inputHasParentheses")
                      : null
            }
            {...sharedFormProps}
          />
        </Stack>
      );
    }

    if (group === "romanize") {
      return (
        <Stack spacing={2}>
          {renderActionChips<RomanizeLanguage>({
            actions: [
              { value: "ja", label: t("textTools.romanizeLanguageJapanese") },
              { value: "ko", label: t("textTools.romanizeLanguageKorean") },
            ],
            current: romanizeLanguage,
            onSelect: setRomanizeLanguage,
          })}

          <ParenthesesForm
            key={group + romanizeLanguage}
            horizontal
            apiPath="/api/text/romanize"
            submitLabel={t("textTools.romanizeAction")}
            extraPayload={{ language: romanizeLanguage }}
            validate={(text) => {
              if (
                romanizeLanguage === "ja"
                  ? OTHER_LANGUAGE_REGEX.test(text)
                  : LATIN_REGEX.test(text)
              )
                return t("textTools.inputOtherLanguageChars");
              return null;
            }}
            {...sharedFormProps}
          />
        </Stack>
      );
    }

    if (group === "furigana") {
      return (
        <Stack spacing={2}>
          {renderActionChips<FuriganaAction>({
            actions: [
              { value: "add", label: t("textTools.subtabAdd") },
              { value: "remove", label: t("textTools.subtabRemove") },
            ],
            current: furiganaAction,
            onSelect: setFuriganaAction,
          })}

          <ParenthesesForm
            key={group + furiganaAction}
            horizontal
            apiPath={
              furiganaAction === "add"
                ? "/api/text/add-furigana"
                : "/api/text/remove-furigana"
            }
            submitLabel={
              furiganaAction === "add"
                ? t("textTools.addFuriganaAction")
                : t("textTools.removeFuriganaAction")
            }
            validate={
              furiganaAction === "add"
                ? undefined
                : (text) =>
                    PARENTHESES_REGEX.test(text)
                      ? null
                      : t("textTools.inputNoParentheses")
            }
            validateWithCheckboxes={
              furiganaAction === "add"
                ? (text, checkboxValues) => {
                    const allowParentheses = checkboxValues["allow_parentheses"] ?? false;
                    if (!allowParentheses && PARENTHESES_REGEX.test(text))
                      return t("textTools.inputHasParentheses");
                    if (OTHER_LANGUAGE_REGEX.test(text))
                      return t("textTools.inputOtherLanguageChars");
                    return null;
                  }
                : undefined
            }
            checkboxOptions={
              furiganaAction === "remove"
                ? [
                    {
                      key: "remove_brackets",
                      label: t("textTools.removeFuriganaRemoveBracketsOption"),
                      defaultValue: true,
                      buildPayload: (checked: boolean) => ({
                        remove_brackets: checked,
                      }),
                    },
                  ]
                : [
                    {
                      key: "allow_parentheses",
                      label: t("textTools.addFuriganaAllowParenthesesOption"),
                      defaultValue: false,
                      buildPayload: () => ({}),
                    },
                    {
                      key: "hiragana_only",
                      label: t("textTools.addFuriganaHiraganaOnlyOption"),
                      defaultValue: false,
                      buildPayload: (checked: boolean) =>
                        checked ? { mode: "hiragana_only" } : {},
                    },
                  ]
            }
            {...sharedFormProps}
          />
        </Stack>
      );
    }

    if (group === "vocabulary") {
      return (
        <Stack spacing={2}>
          <VocabularyBatchLookup
            key={group}
            apiPath="/api/text/vocabulary/batch"
            submitLabel={t("textTools.vocabularyBatchAction")}
            loadingLabel={t("textTools.loading")}
            resetLabel={t("textTools.resetAction")}
            inputLabel={t("textTools.vocabularyBatchInputLabel")}
            inputHelpText={t("textTools.vocabularyBatchInputHelpText")}
            inputRequiredMsg={t("textTools.vocabularyBatchInputRequired")}
            networkErrorMsg={t("textTools.networkError")}
            resultTitle={t("textTools.vocabularyResultTitle")}
            wordLabel={t("textTools.vocabularyWordLabel")}
            readingLabel={t("textTools.vocabularyReadingLabel")}
            romanizedLabel={t("textTools.vocabularyRomanizedLabel")}
            meaningsLabel={t("textTools.vocabularyMeaningsLabel")}
            partOfSpeechLabel={t("textTools.vocabularyPartOfSpeechLabel")}
            commonLabel={t("textTools.vocabularyCommonLabel")}
            uncommonLabel={t("textTools.vocabularyUncommonLabel")}
            standbyTitle={t("textTools.vocabularyStandbyTitle")}
            standbyDescription={t("textTools.vocabularyStandbyDescription")}
            originalTextLabel={t("textTools.vocabularyBatchOriginalTextLabel")}
            notFoundTitle={t("textTools.vocabularyBatchNotFoundTitle")}
            invalidInputTitle={t("textTools.vocabularyBatchInvalidInputTitle")}
            errorTitle={t("textTools.vocabularyBatchErrorTitle")}
            unknownErrorMsg={t("textTools.vocabularyBatchUnknownError")}
            validate={(text) =>
              PARENTHESES_REGEX.test(text)
                ? t("textTools.inputHasParentheses")
                : null
            }
          />
        </Stack>
      );
    }

    if (group === "vocabExtract") {
      return (
        <VocabExtractForm
          key={group}
          submitLabel={t("textTools.vocabExtractAction")}
          loadingLabel={t("textTools.loading")}
          resetLabel={t("textTools.resetAction")}
          exampleLabel={t("textTools.vocabExtractExampleLabel")}
          exampleHelpText={t("textTools.vocabExtractExampleHelpText")}
          exampleInvalidMsg={t("textTools.vocabExtractExampleInvalidMsg")}
          meaningLanguageLabel={t("textTools.vocabExtractMeaningLanguageLabel")}
          meaningKoreanChipLabel={t("textTools.vocabExtractMeaningKoreanChipLabel")}
          meaningEnglishChipLabel={t("textTools.vocabExtractMeaningEnglishChipLabel")}
          meaningKoreanLabel={t("textTools.vocabExtractMeaningKoreanLabel")}
          meaningKoreanHelpText={t("textTools.vocabExtractMeaningKoreanHelpText")}
          meaningEnglishInputLabel={t("textTools.vocabExtractMeaningEnglishInputLabel")}
          meaningEnglishInputHelpText={t("textTools.vocabExtractMeaningEnglishInputHelpText")}
          meaningKoreanInvalidMsg={t("textTools.vocabExtractMeaningKoreanInvalidMsg")}
          meaningEnglishInvalidMsg={t("textTools.vocabExtractMeaningEnglishInvalidMsg")}
          inputRequiredMsg={t("textTools.vocabExtractInputRequired")}
          lineMismatchMsg={t("textTools.vocabExtractLineMismatch")}
          tooManyPairsMsg={t("textTools.vocabExtractTooManyPairs")}
          networkErrorMsg={t("textTools.networkError")}
          standbyTitle={t("textTools.vocabExtractStandbyTitle")}
          standbyDescription={t("textTools.vocabExtractStandbyDescription")}
          resultTitle={t("textTools.vocabExtractResultTitle")}
          wordLabel={t("textTools.vocabExtractWordLabel")}
          meaningEnglishLabel={t("textTools.vocabExtractMeaningEnglishLabel")}
          meaningKoreanResultLabel={t("textTools.vocabExtractMeaningKoreanResultLabel")}
          pronunciationLabel={t("textTools.vocabExtractPronunciationLabel")}
          exampleResultLabel={t("textTools.vocabExtractExampleResultLabel")}
          translationEnglishLabel={t("textTools.vocabExtractTranslationEnglishLabel")}
          translationKoreanLabel={t("textTools.vocabExtractTranslationKoreanLabel")}
          exampleHiraganaLabel={t("textTools.vocabExtractExampleHiraganaLabel")}
        />
      );
    }

    if (group === "removeEqualSign") {
      return (
        <Stack spacing={2}>
          {renderActionChips<RemoveSide>({
            actions: [
              { value: "left", label: t("textTools.subtabLeft") },
              { value: "right", label: t("textTools.subtabRight") },
            ],
            current: removeSide,
            onSelect: setRemoveSide,
          })}

          <ParenthesesForm
            key={group + removeSide}
            horizontal
            apiPath="/api/text/remove-equal-sign"
            submitLabel={t("textTools.removeEqualSignAction")}
            extraPayload={{ remove_side: removeSide }}
            checkboxOptions={
              removeSide === "right"
                ? [
                    {
                      key: "strip_leading_specials",
                      label: t("textTools.removeEqualSignStripLeadingSpecialsOption"),
                      defaultValue: false,
                      buildPayload: (checked: boolean) => ({
                        strip_leading_specials: checked,
                      }),
                    },
                  ]
                : undefined
            }
            validate={(text) =>
              SPLITTER_REGEX.test(text) ? null : t("textTools.inputNoSplitter")
            }
            {...sharedFormProps}
          />
        </Stack>
      );
    }
    return null;
  }

  return (
    <PageLayout>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {t("textTools.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("textTools.description")}
          </Typography>
        </Box>

        <Card>
          <Tabs
            value={group}
            onChange={(_, value: ToolGroup) => setGroup(value)}
            sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
          >
            <Tab label={t("textTools.tabVocabExtract")} value="vocabExtract" />
            <Tab label={t("textTools.tabFurigana")} value="furigana" />
            <Tab label={t("textTools.tabRemoveEqualSign")} value="removeEqualSign" />
            <Tab label={t("textTools.tabVocabulary")} value="vocabulary" />
            <Tab label={t("textTools.tabRomanize")} value="romanize" />
            <Tab label={t("textTools.tabParentheses")} value="parentheses" />
          </Tabs>

          <CardContent>{renderCurrentForm()}</CardContent>
        </Card>
      </Stack>
    </PageLayout>
  );
}
