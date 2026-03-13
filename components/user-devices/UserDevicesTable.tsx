import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import type { AdminManagedDeviceListItem } from "@/types/device";

import {
  formatDeviceTimestamp,
  getLatestLastSeenAt,
  getUserPlatformSummary,
} from "./utils";

interface UserDevicesTableProps {
  users: AdminManagedDeviceListItem[];
  onSelectUser: (user: AdminManagedDeviceListItem) => void;
  emptyLabel: string;
}

export default function UserDevicesTable({
  users,
  onSelectUser,
  emptyLabel,
}: UserDevicesTableProps) {
  const { t } = useTranslation();

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("users.username")}</TableCell>
            <TableCell>{t("users.email")}</TableCell>
            <TableCell>{t("users.role")}</TableCell>
            <TableCell>{t("users.devices.registeredDevices")}</TableCell>
            <TableCell>{t("users.devices.latestSeen")}</TableCell>
            <TableCell>{t("users.devices.platforms")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">{emptyLabel}</Typography>
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow
                key={user.uid}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => onSelectUser(user)}
              >
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar
                      sx={{ width: 32, height: 32, fontSize: 14 }}
                    >
                      {(user.displayName || user.email || "?")[0].toUpperCase()}
                    </Avatar>
                    <Typography variant="body2">
                      {user.displayName || user.email}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={user.role} size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {t("users.devices.deviceCount", {
                      count: user.registeredDeviceCount,
                      max: user.maxRegisteredDevices,
                    })}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatDeviceTimestamp(getLatestLastSeenAt(user))}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {getUserPlatformSummary(user, t)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
