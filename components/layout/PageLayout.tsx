"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import AppNav from "./AppNav";
import AppNavSidebar from "./AppNavSidebar";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "row",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      <AppNavSidebar />
      <Box
        sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
      >
        <AppNav />
        <Container
          maxWidth="lg"
          sx={{ flex: 1, py: 3, display: "flex", flexDirection: "column" }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
}
