"use client";

/**
 * UrlListSection
 *
 * 현재까지 추가된 URL 항목 목록을 표시하는 섹션 컴포넌트입니다.
 *
 * 표시 상태:
 *  - items가 비어 있으면 "항목 없음" 안내 텍스트 표시
 *  - items가 있으면 FileListItem 목록 렌더링
 *
 * 헤더 우측에 현재 항목 수를 Chip으로 표시합니다.
 */

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import FileListItem from "@/components/add-voca/FileListItem";
import type { UrlItem } from "@/components/add-voca/UrlUploadTab";

// ─── 공용 스타일 상수 ─────────────────────────────────────────────────────
const sectionSx = {
  borderRadius: 2,
  px: { xs: 1.5, sm: 2 },
  py: { xs: 1.5, sm: 2 },
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface UrlListSectionProps {
  /** 표시할 URL 항목 배열 */
  items: UrlItem[];
  /** 항목 클릭 시 호출 (해당 인덱스 전달) */
  onItemClick: (index: number) => void;
  /** 항목 삭제 버튼 클릭 시 호출 (해당 인덱스 전달) */
  onDelete: (index: number) => void;
}

export default function UrlListSection({
  items,
  onItemClick,
  onDelete,
}: UrlListSectionProps) {
  const { t } = useTranslation();

  return (
    <Paper variant="outlined" sx={sectionSx}>
      {/* 헤더: 제목 + 현재 항목 수 Chip */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1.5,
        }}
      >
        <Typography variant="subtitle2" fontWeight={600}>
          {t("addVoca.urlUpload")}
        </Typography>
        {/* 항목이 있으면 primary 색상, 없으면 default */}
        <Chip
          size="small"
          label={items.length}
          color={items.length > 0 ? "primary" : "default"}
        />
      </Box>

      {/* 구분선: 목록이 있을 때만 하단 여백 추가 */}
      <Divider sx={{ mb: items.length > 0 ? 1 : 0 }} />

      {items.length === 0 ? (
        // 항목 없음 상태
        <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
          {t("addVoca.noItems")}
        </Typography>
      ) : (
        // URL 목록 렌더링
        <List sx={{ py: 0 }}>
          {items.map((item, index) => (
            <FileListItem
              key={item.id}
              label={item.url}
              dayName={item.dayName}
              secondaryLabel={item.counterOptionLabel}
              // 데이터가 있고 단어가 1개 이상일 때 hasData=true
              hasData={!!item.data && item.data.words.length > 0}
              onClick={() => onItemClick(index)}
              onDelete={() => onDelete(index)}
            />
          ))}
        </List>
      )}
    </Paper>
  );
}
