import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { useTranslation } from "react-i18next";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 100 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

interface UserStatsProps {
  total: number;
  unlimitedCount: number;
  freeCount: number;
}

export default function UserStats({
  total,
  unlimitedCount,
  freeCount,
}: UserStatsProps) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
      <StatCard label={t("users.totalMembers")} value={total} />
      <StatCard label={t("users.unlimitedMembers")} value={unlimitedCount} />
      <StatCard label={t("users.freeMembers")} value={freeCount} />
    </Stack>
  );
}
