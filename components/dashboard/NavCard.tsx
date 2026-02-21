'use client';

import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface NavCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
}

export default function NavCard({ title, description, icon, href }: NavCardProps) {
  const router = useRouter();

  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={() => router.push(href)} sx={{ height: '100%' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Box sx={{ mb: 2, color: 'primary.main', '& svg': { fontSize: 48 } }}>
            {icon}
          </Box>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
