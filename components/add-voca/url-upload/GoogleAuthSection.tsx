"use client";

/**
 * GoogleAuthSection
 *
 * Google Sheets 인증(OAuth 토큰) 상태를 시각적으로 표시하고,
 * 미인증 상태일 때 연결 버튼을 렌더링하는 섹션 컴포넌트입니다.
 *
 * 표시 상태:
 *  - configured === false : Apps Script / 환경변수 미설정 안내 Alert
 *  - token 있음           : "연결됨" Chip (success)
 *  - token 없음           : Google 연결 버튼 (loading 상태 포함)
 */

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import GoogleIcon from "@mui/icons-material/Google";
import { useTranslation } from "react-i18next";

// ─── 공용 스타일 상수 (부모 파일과 동일 값) ───────────────────────────────
const sectionSx = {
  borderRadius: 2,
  px: { xs: 1.5, sm: 2 },
  py: { xs: 1.5, sm: 2 },
};

const sectionTitleSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  mb: 1.5,
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface GoogleAuthSectionProps {
  /** 현재 발급된 OAuth 액세스 토큰 (없으면 undefined) */
  token: string | undefined;
  /** 토큰 요청 중(로딩) 여부 */
  loading: boolean;
  /** Google Sheets API 연동이 환경변수 등으로 설정되어 있는지 여부 */
  configured: boolean;
  /** Google 연결 버튼 클릭 핸들러 */
  onConnect: () => void;
}

export default function GoogleAuthSection({
  token,
  loading,
  configured,
  onConnect,
}: GoogleAuthSectionProps) {
  const { t } = useTranslation();

  return (
    <Paper variant="outlined" sx={sectionSx}>
      {/* 섹션 제목: Google 아이콘 + 레이블 */}
      <Box sx={sectionTitleSx}>
        <GoogleIcon fontSize="small" color="action" />
        <Typography variant="subtitle2" fontWeight={600}>
          {t("addVoca.connectGoogle")}
        </Typography>
      </Box>

      {/* 인증 상태에 따른 UI 분기 */}
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        {!configured ? (
          // 1) 환경변수(Apps Script URL 등)가 설정되지 않은 경우
          <Alert severity="info" sx={{ width: "100%" }}>
            {t("addVoca.googleNotConfigured")}
          </Alert>
        ) : token ? (
          // 2) 토큰이 있는 경우 → 연결됨 표시
          <Chip
            icon={<GoogleIcon />}
            label={t("addVoca.connected")}
            color="success"
            variant="outlined"
          />
        ) : (
          // 3) 토큰이 없는 경우 → 연결 버튼 표시
          <Button
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={onConnect}
            disabled={loading}
          >
            {loading ? t("common.loading") : t("addVoca.connectGoogle")}
          </Button>
        )}
      </Box>
    </Paper>
  );
}
