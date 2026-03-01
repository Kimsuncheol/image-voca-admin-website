"use client";

/**
 * UrlInputSection
 *
 * Google Sheets URL과 Day 이름을 입력받아 시트 데이터를 fetch하고
 * 부모 컴포넌트에 추가 요청을 전달하는 입력 폼 섹션입니다.
 *
 * 포함 요소:
 *  - Day 번호 입력 필드 (prefix "Day" 자동 처리)
 *  - Sheets URL 입력 필드 (Enter 키로 제출 가능)
 *  - "URL 추가" 버튼 (fetch 중 로딩 상태 표시)
 *
 * 비활성화 조건:
 *  - token이 없을 때 URL 필드 비활성화
 *  - urlInput, dayInput 미입력 또는 fetch 중일 때 버튼 비활성화
 */

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import LinkIcon from "@mui/icons-material/Link";
import { useTranslation } from "react-i18next";

// ─── 공용 스타일 상수 ─────────────────────────────────────────────────────
const sectionSx = {
  borderRadius: 3,
  px: { xs: 1.75, sm: 2.25 },
  py: { xs: 1.75, sm: 2.25 },
  borderColor: "divider",
  backgroundColor: "background.paper",
};

const sectionTitleSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  mb: 1.25,
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    height: 40,
    borderRadius: 2.5,
    backgroundColor: "background.default",
    transition: "border-color 120ms ease, box-shadow 120ms ease",
    "& fieldset": {
      borderColor: "divider",
    },
    "&:hover fieldset": {
      borderColor: "text.disabled",
    },
    "&.Mui-focused fieldset": {
      borderColor: "primary.main",
      borderWidth: 1,
    },
  },
};

const addButtonSx = {
  height: 40,
  whiteSpace: "nowrap",
  minWidth: { xs: "100%", sm: 140 },
  px: 2,
  borderRadius: 2.5,
  borderColor: "divider",
  "&:hover": {
    borderColor: "text.disabled",
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface UrlInputSectionProps {
  /** URL 텍스트필드 현재 값 */
  urlInput: string;
  /** Day 텍스트필드 현재 값 (예: "Day3") */
  dayInput: string;
  /** Sheets fetch 진행 중 여부 (버튼 로딩 상태에 사용) */
  fetchingUrl: boolean;
  /** OAuth 액세스 토큰 (없으면 URL 필드 비활성화) */
  token: string | undefined;
  /** URL 값 변경 핸들러 */
  onUrlChange: (value: string) => void;
  /** Day 값 변경 핸들러 */
  onDayChange: (value: string) => void;
  /** "URL 추가" 버튼 / Enter 키 제출 핸들러 */
  onAddUrl: () => void;
}

export default function UrlInputSection({
  urlInput,
  dayInput,
  fetchingUrl,
  token,
  onUrlChange,
  onDayChange,
  onAddUrl,
}: UrlInputSectionProps) {
  const { t } = useTranslation();

  // Day 필드에서 "Day" 접두사를 제거한 순수 숫자 문자열 추출
  const dayDisplayValue = dayInput.replace(/^Day/i, "");

  /**
   * Day 입력 변경 처리
   * - 공백 제거 후 "Day" 접두사를 붙여 상위로 전달
   * - 빈 값이면 빈 문자열 전달
   */
  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\s+/g, "");
    onDayChange(val ? `Day${val}` : "");
  };

  /**
   * URL 입력 시 Enter 키 처리
   * - token / urlInput / dayInput 모두 있어야 제출
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && token && urlInput.trim() && dayInput) {
      onAddUrl();
    }
  };

  return (
    <Paper variant="outlined" sx={sectionSx}>
      {/* 섹션 제목: 링크 아이콘 + 레이블 */}
      <Box sx={sectionTitleSx}>
        <LinkIcon fontSize="small" sx={{ color: "text.disabled" }} />
        <Typography variant="subtitle2" fontWeight={600}>
          {t("addVoca.addUrl")}
        </Typography>
      </Box>

      {/* 입력 필드 행: 반응형 (xs→column, sm→row) */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
        {/* Day 번호 입력 */}
        <TextField
          label={t("addVoca.day")}
          value={dayDisplayValue}
          onChange={handleDayChange}
          size="small"
          sx={{ width: { sm: 128 }, ...fieldSx }}
          InputProps={{
            // "Day" 텍스트를 prefix adornment로 표시
            startAdornment: (
              <InputAdornment position="start">Day</InputAdornment>
            ),
          }}
          placeholder="1"
        />

        {/* Google Sheets URL 입력 */}
        <TextField
          value={urlInput}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={t("addVoca.urlPlaceholder")}
          fullWidth
          size="small"
          // 토큰이 없으면 입력 불가
          disabled={!token}
          sx={fieldSx}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LinkIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          onKeyDown={handleKeyDown}
        />

        {/* URL 추가 버튼 */}
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={onAddUrl}
          // fetch 중이거나 필수 입력값 미충족 시 비활성화
          disabled={fetchingUrl || !urlInput.trim() || !token || !dayInput}
          sx={addButtonSx}
        >
          {fetchingUrl ? t("addVoca.fetchingSheets") : t("addVoca.addUrl")}
        </Button>
      </Stack>
    </Paper>
  );
}
