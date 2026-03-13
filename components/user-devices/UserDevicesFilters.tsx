import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import SearchIcon from "@mui/icons-material/Search";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";

type DeviceSortKey = "lastSeenAt" | "createdAt" | "registeredDeviceCount";

interface UserDevicesFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  platformFilter: "all" | "ios" | "android";
  onPlatformFilterChange: (value: "all" | "ios" | "android") => void;
  notificationFilter: string;
  onNotificationFilterChange: (value: string) => void;
  sortBy: DeviceSortKey;
  onSortByChange: (value: DeviceSortKey) => void;
  notificationOptions: string[];
  scopedUserLabel?: string | null;
  onClearScopedUser?: () => void;
}

export default function UserDevicesFilters({
  search,
  onSearchChange,
  platformFilter,
  onPlatformFilterChange,
  notificationFilter,
  onNotificationFilterChange,
  sortBy,
  onSortByChange,
  notificationOptions,
  scopedUserLabel,
  onClearScopedUser,
}: UserDevicesFiltersProps) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <TextField
          size="small"
          placeholder={t("users.devices.search")}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
            },
          }}
        />

        <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 160 } }}>
          <InputLabel id="platform-filter-label">
            {t("users.devices.platformFilter")}
          </InputLabel>
          <Select
            labelId="platform-filter-label"
            label={t("users.devices.platformFilter")}
            value={platformFilter}
            onChange={(event) =>
              onPlatformFilterChange(event.target.value as "all" | "ios" | "android")
            }
          >
            <MenuItem value="all">{t("users.devices.allPlatforms")}</MenuItem>
            <MenuItem value="ios">iOS</MenuItem>
            <MenuItem value="android">Android</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 220 } }}>
          <InputLabel id="notification-filter-label">
            {t("users.devices.notificationFilter")}
          </InputLabel>
          <Select
            labelId="notification-filter-label"
            label={t("users.devices.notificationFilter")}
            value={notificationFilter}
            onChange={(event) => onNotificationFilterChange(event.target.value)}
          >
            <MenuItem value="all">
              {t("users.devices.allNotificationStatuses")}
            </MenuItem>
            {notificationOptions.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 220 } }}>
          <InputLabel id="sort-by-label">{t("users.devices.sortBy")}</InputLabel>
          <Select
            labelId="sort-by-label"
            label={t("users.devices.sortBy")}
            value={sortBy}
            onChange={(event) =>
              onSortByChange(
                event.target.value as "lastSeenAt" | "createdAt" | "registeredDeviceCount",
              )
            }
          >
            <MenuItem value="lastSeenAt">{t("users.devices.sortLastSeen")}</MenuItem>
            <MenuItem value="createdAt">{t("users.devices.sortCreatedAt")}</MenuItem>
            <MenuItem value="registeredDeviceCount">
              {t("users.devices.sortDeviceCount")}
            </MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {scopedUserLabel && onClearScopedUser && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            color="primary"
            variant="outlined"
            label={t("users.devices.scopedUser", { user: scopedUserLabel })}
            onDelete={onClearScopedUser}
          />
        </Stack>
      )}
    </Stack>
  );
}
