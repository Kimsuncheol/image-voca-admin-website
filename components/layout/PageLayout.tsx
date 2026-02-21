'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import AppNav from './AppNav';

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <AppNav />
      <Container maxWidth="lg" sx={{ flex: 1, py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}
