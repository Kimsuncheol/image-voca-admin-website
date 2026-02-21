'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyAuthError } from '@/lib/firebase/auth';
import { signInSchema, type SignInFormData } from '@/lib/schemas/authSchemas';

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
    <Card sx={{ maxWidth: 420, width: '100%', mx: 2 }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom textAlign="center" fontWeight={600}>
          {t('auth.signIn')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            {...register('email')}
            label={t('auth.email')}
            type="email"
            fullWidth
            margin="normal"
            error={!!errors.email}
            helperText={errors.email?.message}
            autoComplete="email"
          />

          <TextField
            {...register('password')}
            label={t('auth.password')}
            type={showPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
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
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <FormControlLabel
            control={<Checkbox {...register('rememberMe')} />}
            label={t('auth.rememberMe')}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ mt: 2, mb: 2 }}
          >
            {loading ? t('common.loading') : t('auth.signIn')}
          </Button>

          <Typography variant="body2" textAlign="center">
            {t('auth.noAccount')}{' '}
            <Link href="/sign-up" style={{ textDecoration: 'none' }}>
              <Typography component="span" variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
                {t('auth.signUpLink')}
              </Typography>
            </Link>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
