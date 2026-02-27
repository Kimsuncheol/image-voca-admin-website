import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import { useTranslation } from "react-i18next";
import type { AppUser } from "@/types/user";
import { roleColors, planChipColor, getPlanLabel } from "./utils";

interface UserTableProps {
  users: AppUser[];
  onSelectUser: (user: AppUser) => void;
}

export default function UserTable({ users, onSelectUser }: UserTableProps) {
  const { t } = useTranslation();

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("users.username")}</TableCell>
            <TableCell>{t("users.email")}</TableCell>
            <TableCell>{t("users.role")}</TableCell>
            <TableCell>{t("users.plan")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">
                  {t("users.noUsers")}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => (
              <TableRow
                key={u.uid}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => onSelectUser(u)}
              >
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar
                      src={u.photoURL}
                      sx={{ width: 32, height: 32, fontSize: 14 }}
                    >
                      {(u.displayName || u.email || "?")[0].toUpperCase()}
                    </Avatar>
                    <Typography variant="body2">
                      {u.displayName || u.email}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {u.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={u.role}
                    color={roleColors[u.role]}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getPlanLabel(u.plan, t)}
                    color={planChipColor(u.plan)}
                    size="small"
                    variant={
                      u.plan && u.plan !== "free" ? "filled" : "outlined"
                    }
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
