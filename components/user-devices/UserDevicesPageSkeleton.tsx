import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import PageLayout from "@/components/layout/PageLayout";

interface UserDevicesPageSkeletonProps {
  title: string;
}

export default function UserDevicesPageSkeleton({
  title,
}: UserDevicesPageSkeletonProps) {
  return (
    <PageLayout>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {title}
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Skeleton
          variant="rounded"
          height={40}
          sx={{ flex: 1, borderRadius: "10px" }}
        />
        <Skeleton variant="rounded" width={160} height={40} />
        <Skeleton variant="rounded" width={220} height={40} />
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} variant="text" width="100%" height={30} />
          ))}
        </Stack>
      </Paper>
    </PageLayout>
  );
}
