"use client";

/**
 * UrlUploadTab
 *
 * Google Sheets URL을 통해 단어 데이터를 업로드하는 탭 컴포넌트입니다.
 * 이 파일은 상태 관리와 비즈니스 로직만 담당하며,
 * 각 섹션의 UI는 별도 서브 컴포넌트에 위임합니다.
 *
 * 디렉터리 구조:
 *   url-upload/
 *     GoogleAuthSection.tsx  — Google 연결 섹션 (OAuth 토큰 상태 표시)
 *     ErrorAlerts.tsx        — 에러 알림 모음 (auth / fetch / validation)
 *     UrlInputSection.tsx    — URL·Day 입력 폼 섹션
 *     UrlListSection.tsx     — 추가된 URL 목록 섹션
 *
 * 상태:
 *   urlInput          — URL 텍스트필드 값
 *   dayInput          — Day 텍스트필드 값 (예: "Day3")
 *   modalOpen         — UploadModal 열림 여부
 *   activeIndex       — 현재 편집 중인 항목 인덱스
 *   fetchingUrl       — Sheets 데이터 fetch 진행 중 여부
 *   authError         — Google OAuth 에러 메시지
 *   urlFetchError     — URL fetch 에러 메시지
 *   urlValidationError— 헤더 검증 실패 결과 (ParseResult)
 */

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { useGoogleSheetsAuth } from "@/lib/hooks/useGoogleSheetsAuth";
import { fetchSheetWithToken } from "@/lib/utils/sheetsApi";
import type { ParseResult } from "@/lib/utils/csvParser";
import UploadModal from "./UploadModal";

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────────────
import GoogleAuthSection from "./url-upload/GoogleAuthSection";
import ErrorAlerts from "./url-upload/ErrorAlerts";
import UrlInputSection from "./url-upload/UrlInputSection";
import UrlListSection from "./url-upload/UrlListSection";

// ─── 타입 ──────────────────────────────────────────────────────────────────
/** URL 업로드 탭에서 관리하는 단일 항목 구조 */
export interface UrlItem {
  id: string;
  url: string;
  /** "Day3" 형태의 Day 이름 */
  dayName: string;
  /** fetch 성공 시 채워지는 파싱 결과, 실패 시 null */
  data: ParseResult | null;
}

interface UrlUploadTabProps {
  /** 현재 URL 항목 배열 (controlled) */
  items: UrlItem[];
  /** 항목 배열 변경 시 부모에 알리는 콜백 */
  onItemsChange: (items: UrlItem[]) => void;
  /** 콜로케이션 모드 여부 (헤더 검증 기준이 달라짐) */
  isCollocation?: boolean;
}

// ─── 컴포넌트 ──────────────────────────────────────────────────────────────
export default function UrlUploadTab({
  items,
  onItemsChange,
  isCollocation,
}: UrlUploadTabProps) {
  // Google Sheets OAuth 훅
  const {
    token,
    loading: tokenLoading,
    configured,
    requestToken,
  } = useGoogleSheetsAuth();

  // ── 폼 입력 상태 ──────────────────────────────────────────────────────
  const [urlInput, setUrlInput] = useState("");
  const [dayInput, setDayInput] = useState("");

  // ── 모달 상태 ─────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  /** 현재 UploadModal에서 편집 중인 items 인덱스 */
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // ── 비동기 / 에러 상태 ────────────────────────────────────────────────
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [authError, setAuthError] = useState("");
  const [urlFetchError, setUrlFetchError] = useState("");
  const [urlValidationError, setUrlValidationError] =
    useState<ParseResult | null>(null);

  // ── 이벤트 핸들러 ─────────────────────────────────────────────────────

  /**
   * Google 연결 버튼 클릭 핸들러
   * requestToken()으로 OAuth 팝업을 열고, 실패 시 authError에 저장합니다.
   */
  const handleConnectGoogle = async () => {
    setAuthError("");
    try {
      await requestToken();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    }
  };

  /**
   * URL 추가 핸들러
   * - Google Sheets에서 데이터를 fetch합니다.
   * - 헤더 검증 실패 시 urlValidationError에 저장하고 항목 추가를 중단합니다.
   * - fetch 자체 실패 시 data=null인 항목을 추가하고 urlFetchError에 저장합니다.
   * - 성공 시 항목을 추가하고 입력 필드를 초기화합니다.
   */
  const handleAddUrl = async () => {
    if (!urlInput.trim() || !token || !dayInput) return;
    setUrlFetchError("");
    setUrlValidationError(null);
    setFetchingUrl(true);
    try {
      const data = await fetchSheetWithToken(urlInput, token, isCollocation);
      // 검증 에러가 있으면 항목 추가 없이 에러만 표시
      if (data.blockingError) {
        setUrlValidationError(data);
        return;
      }
      onItemsChange([
        ...items,
        { id: crypto.randomUUID(), url: urlInput, dayName: dayInput, data },
      ]);
      setUrlInput("");
      setDayInput("");
    } catch (err) {
      // fetch 실패: 에러 메시지 저장 + data=null로 항목 추가 (재시도 가능하도록)
      const message = err instanceof Error ? err.message : String(err);
      setUrlFetchError(message);
      onItemsChange([
        ...items,
        {
          id: crypto.randomUUID(),
          url: urlInput,
          dayName: dayInput,
          data: null,
        },
      ]);
      setUrlInput("");
      setDayInput("");
    } finally {
      setFetchingUrl(false);
    }
  };

  /**
   * URL 텍스트필드 값 변경 핸들러
   * 값이 바뀔 때 이전 에러를 함께 초기화합니다.
   */
  const handleUrlChange = (value: string) => {
    setUrlInput(value);
    if (urlValidationError) setUrlValidationError(null);
    if (urlFetchError) setUrlFetchError("");
  };

  /**
   * 목록 항목 클릭 핸들러
   * 클릭된 항목의 인덱스를 저장하고 UploadModal을 엽니다.
   */
  const handleItemClick = (index: number) => {
    setActiveIndex(index);
    setModalOpen(true);
  };

  /** 항목 삭제 핸들러 */
  const handleDelete = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  /**
   * UploadModal 확인 핸들러
   * - activeIndex의 항목을 새 dayName·data로 업데이트합니다.
   * - 같은 dayName을 가진 다른 항목은 제거합니다 (사용자가 Replace를 확인한 경우).
   */
  const handleModalConfirm = (dayName: string, data: ParseResult) => {
    let updated = [...items];
    updated[activeIndex] = { ...updated[activeIndex], dayName, data };
    // 동일 dayName을 가진 다른 항목 제거
    updated = updated.filter(
      (item, i) => i === activeIndex || item.dayName !== dayName,
    );
    onItemsChange(updated);
  };

  // ── 렌더 ──────────────────────────────────────────────────────────────
  return (
    <Box>
      <Stack spacing={2}>
        {/* 1) Google 인증 섹션: 연결 상태 표시 및 연결 버튼 */}
        <GoogleAuthSection
          token={token}
          loading={tokenLoading}
          configured={configured}
          onConnect={handleConnectGoogle}
        />

        {/* 2) 에러 알림 섹션: auth / fetch / validation 에러를 한곳에서 표시 */}
        <ErrorAlerts
          authError={authError}
          urlFetchError={urlFetchError}
          urlValidationError={urlValidationError}
          onClearAuthError={() => setAuthError("")}
          onClearUrlFetchError={() => setUrlFetchError("")}
          onClearValidationError={() => setUrlValidationError(null)}
        />

        {/* 3) URL 입력 섹션: Day·URL 입력 폼 및 추가 버튼 */}
        <UrlInputSection
          urlInput={urlInput}
          dayInput={dayInput}
          fetchingUrl={fetchingUrl}
          token={token}
          onUrlChange={handleUrlChange}
          onDayChange={setDayInput}
          onAddUrl={handleAddUrl}
        />

        {/* 4) URL 목록 섹션: 추가된 항목 표시, 클릭/삭제 가능 */}
        <UrlListSection
          items={items}
          onItemClick={handleItemClick}
          onDelete={handleDelete}
        />
      </Stack>

      {/* UploadModal: 항목 클릭 시 열리는 편집 모달 */}
      <UploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleModalConfirm}
        initialDayName={activeIndex >= 0 ? items[activeIndex]?.dayName : ""}
        initialData={activeIndex >= 0 ? items[activeIndex]?.data : null}
        isCollocation={isCollocation}
        existingDayNames={items
          .filter((_, i) => i !== activeIndex)
          .map((i) => i.dayName)
          .filter(Boolean)}
      />
    </Box>
  );
}
