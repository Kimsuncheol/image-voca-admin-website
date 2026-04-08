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
import VocabularyBatchLookup from "./VocabularyBatchLookup";

type ToolGroup =
  | "parentheses"
  | "romanize"
  | "furigana"
  | "translate"
  | "vocabulary";
type ParenthesesAction = "generate" | "remove";
type FuriganaAction = "add" | "remove";

export default function TextToolsPage() {
  const { t } = useTranslation();
  const { user, authLoading } = useAdminGuard();

  const [group, setGroup] = useState<ToolGroup>("parentheses");
  const [parenthesesAction, setParenthesesAction] =
    useState<ParenthesesAction>("generate");
  const [furiganaAction, setFuriganaAction] = useState<FuriganaAction>("add");

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
            {...sharedFormProps}
          />
        </Stack>
      );
    }

    if (group === "romanize") {
      return (
        <ParenthesesForm
          horizontal
          apiPath="/api/text/romanize"
          submitLabel={t("textTools.romanizeAction")}
          {...sharedFormProps}
        />
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
          />
        </Stack>
      );
    }

    return (
      <ParenthesesForm
        horizontal
        apiPath="/api/text/translate"
        submitLabel={t("textTools.translateAction")}
        {...sharedFormProps}
      />
    );
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
            <Tab label={t("textTools.tabParentheses")} value="parentheses" />
            <Tab label={t("textTools.tabRomanize")} value="romanize" />
            <Tab label={t("textTools.tabFurigana")} value="furigana" />
            <Tab label={t("textTools.tabTranslate")} value="translate" />
            <Tab label={t("textTools.tabVocabulary")} value="vocabulary" />
          </Tabs>

          <CardContent>{renderCurrentForm()}</CardContent>
        </Card>
      </Stack>
    </PageLayout>
  );
}
