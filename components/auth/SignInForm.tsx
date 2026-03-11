'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyAuthError } from '@/lib/firebase/auth';
import { signInSchema, type SignInFormData } from '@/lib/schemas/authSchemas';
import icon from "@/public/icon.png";



export default function SignInForm() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    setError('');
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      router.push('/');
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      setError(getFriendlyAuthError(firebaseError.code || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 400,
        width: '100%',
        mx: 2,
        px: { xs: 3, sm: 4 },
        py: 5,
        borderRadius: 4,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
      }}
    >
      {/* Brand mark */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Image src={icon} alt="Voca" width={52} height={52} style={{ borderRadius: 14 }} />
      </Box>

      <Typography variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 4 }}>
        {t('auth.signIn')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2}>
          <TextField
            {...register('email')}
            label={t('auth.email')}
            type="email"
            fullWidth
            error={!!errors.email}
            helperText={errors.email?.message}
            autoComplete="email"
          />

          <TextField
            {...register('password')}
            label={t('auth.password')}
            type={showPassword ? 'text' : 'password'}
            fullWidth
            error={!!errors.password}
            helperText={errors.password?.message}
            autoComplete="current-password"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      aria-label="Toggle password visibility"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>

        <FormControlLabel
          control={<Checkbox {...register('rememberMe')} size="small" />}
          label={<Typography variant="body2">{t('auth.rememberMe')}</Typography>}
          sx={{ mt: 1 }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          sx={{ mt: 2, mb: 3, borderRadius: 2, py: 1.5, fontWeight: 600, textTransform: 'none', fontSize: '1rem' }}
        >
          {loading ? t('common.loading') : t('auth.signIn')}
        </Button>

        <Divider sx={{ mb: 2.5 }} />

        <Typography variant="body2" textAlign="center" color="text.secondary">
          {t('auth.noAccount')}{' '}
          <Link href="/sign-up" style={{ textDecoration: 'none' }}>
            <Typography component="span" variant="body2" color="primary" fontWeight={600} sx={{ cursor: 'pointer' }}>
              {t('auth.signUpLink')}
            </Typography>
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
