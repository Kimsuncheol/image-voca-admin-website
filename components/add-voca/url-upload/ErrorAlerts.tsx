"use client";

/**
 * ErrorAlerts
 *
 * URL 업로드 탭에서 발생할 수 있는 세 가지 에러를
 * MUI Alert 컴포넌트로 집약하여 표시하는 순수 UI 컴포넌트입니다.
 *
 * 표시 가능 에러 종류:
 *  - authError          : Google OAuth 인증 실패 메시지
 *  - urlFetchError      : Google Sheets 데이터 fetch 실패 메시지
 *  - urlValidationError : CSV/시트 구조 또는 행 단위 검증 실패 결과
 *
 * 에러가 하나도 없으면 null을 반환하여 DOM에 아무것도 렌더링하지 않습니다.
 */

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { ParseResult } from "@/lib/utils/csvParser";

// ─── Props ────────────────────────────────────────────────────────────────────
interface ErrorAlertsProps {
  /** Google OAuth 연결 실패 시 에러 메시지 */
  authError: string;
  /** Google Sheets fetch 실패 시 에러 메시지 */
  urlFetchError: string;
  /** CSV/시트 헤더 또는 행 단위 검증 실패 결과 */
  urlValidationError: ParseResult | null;
  /** authError Alert 닫기 핸들러 */
  onClearAuthError: () => void;
  /** urlFetchError Alert 닫기 핸들러 */
  onClearUrlFetchError: () => void;
  /** urlValidationError Alert 닫기 핸들러 */
  onClearValidationError: () => void;
}

// ─── 헬퍼: blockingError 코드 → 번역 키 매핑 ──────────────────────────────
function useBlockingErrorMessage() {
  const { t } = useTranslation();

  return (code?: ParseResult["blockingError"]): string => {
    if (!code) return "";
    if (code === "HEADER_REQUIRED")
      return t("addVoca.validationHeaderRequired");
    if (code === "HEADER_MISMATCH")
      return t("addVoca.validationHeaderMismatch");
    // 'CROSS_HEADER_ROW' 등 그 외 코드
    return t("addVoca.validationCrossHeaderRow");
  };
}

// ─── 컴포넌트 ──────────────────────────────────────────────────────────────
export default function ErrorAlerts({
  authError,
  urlFetchError,
  urlValidationError,
  onClearAuthError,
  onClearUrlFetchError,
  onClearValidationError,
}: ErrorAlertsProps) {
  const { t } = useTranslation();
  const getBlockingErrorMessage = useBlockingErrorMessage();

  // 표시할 에러가 없으면 렌더링 생략
  const hasValidationError = Boolean(
    urlValidationError?.blockingError ||
    urlValidationError?.errors.length,
  );
  const hasError = authError || urlFetchError || hasValidationError;
  if (!hasError) return null;

  return (
    <Stack spacing={1}>
      {/* 1) OAuth 인증 에러 */}
      {authError && (
        <Alert severity="error" onClose={onClearAuthError}>
          {authError}
        </Alert>
      )}

      {/* 2) URL fetch 에러 (서버/네트워크 오류) */}
      {urlFetchError && (
        <Alert severity="error" onClose={onClearUrlFetchError}>
          {t("addVoca.urlFetchError", { message: urlFetchError })}
        </Alert>
      )}

      {/* 3) 구조 검증 에러 */}
      {urlValidationError?.blockingError && (
        <Alert severity="error" onClose={onClearValidationError}>
          {/* 주 에러 메시지 */}
          <Typography variant="body2">
            {getBlockingErrorMessage(urlValidationError.blockingError)}
          </Typography>

          {/* 기대하는 헤더 목록 (있을 때만 표시) */}
          {urlValidationError.expectedHeaders &&
            urlValidationError.expectedHeaders.length > 0 && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {t("addVoca.expectedKeys", {
                  keys: urlValidationError.expectedHeaders.join(", "),
                })}
              </Typography>
            )}

          {/* 실제 감지된 헤더 목록 (있을 때만 표시) */}
          {urlValidationError.detectedHeaders.length > 0 && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {t("addVoca.detectedKeys", {
                keys: urlValidationError.detectedHeaders.join(", "),
              })}
            </Typography>
          )}
        </Alert>
      )}

      {/* 4) 행 단위 검증 경고 */}
      {!urlValidationError?.blockingError &&
        !!urlValidationError?.errors.length && (
          <Alert severity="warning" onClose={onClearValidationError}>
            {urlValidationError.detectedHeaders.length > 0 && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Detected columns:</strong>{" "}
                {urlValidationError.detectedHeaders.join(", ")}
              </Typography>
            )}
            {urlValidationError.errors.slice(0, 5).map((err, index) => (
              <Typography key={index} variant="body2">
                {err}
              </Typography>
            ))}
          </Alert>
        )}
    </Stack>
  );
}
