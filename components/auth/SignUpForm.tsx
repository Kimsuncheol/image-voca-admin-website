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
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyAuthError } from '@/lib/firebase/auth';
import { signUpSchema, type SignUpFormData } from '@/lib/schemas/authSchemas';
import PasswordStrengthBar from './PasswordStrengthBar';

export default function SignUpForm() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const passwordValue = watch('password', '');

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: SignUpFormData) => {
    setError('');
    setLoading(true);
    try {
      await signUp(data.email, data.password, data.username, avatarPreview || undefined);
      router.push('/');
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      setError(getFriendlyAuthError(firebaseError.code || ''));
    } finally {
      setLoading(false);
    }
  };

  const passwordAdornment = (show: boolean, toggle: () => void) => (
    <InputAdornment position="end">
      <IconButton onClick={toggle} edge="end" aria-label="Toggle password visibility">
        {show ? <VisibilityOff /> : <Visibility />}
      </IconButton>
    </InputAdornment>
  );

  return (
    <Card sx={{ maxWidth: 420, width: '100%', mx: 2 }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom textAlign="center" fontWeight={600}>
          {t('auth.signUp')}
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
            {...register('username')}
            label={t('auth.username')}
            fullWidth
            margin="normal"
            error={!!errors.username}
            helperText={errors.username?.message}
            autoComplete="username"
          />

          {/* Avatar upload */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
            <Avatar src={avatarPreview || undefined} sx={{ width: 56, height: 56 }}>
              <PhotoCameraIcon />
            </Avatar>
            <Button variant="outlined" component="label" size="small">
              {t('auth.avatar')}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </Button>
          </Box>

          <TextField
            {...register('password')}
            label={t('auth.password')}
            type={showPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            error={!!errors.password}
            helperText={errors.password?.message}
            autoComplete="new-password"
            slotProps={{
              input: {
                endAdornment: passwordAdornment(showPassword, () => setShowPassword(!showPassword)),
              },
            }}
          />

          <PasswordStrengthBar password={passwordValue} />

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {t('auth.passwordConstraints')}
          </Typography>

          <TextField
            {...register('confirmPassword')}
            label={t('auth.confirmPassword')}
            type={showConfirmPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            autoComplete="new-password"
            slotProps={{
              input: {
                endAdornment: passwordAdornment(showConfirmPassword, () =>
                  setShowConfirmPassword(!showConfirmPassword)
                ),
              },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ mt: 2, mb: 2 }}
          >
            {loading ? t('common.loading') : t('auth.signUp')}
          </Button>

          <Typography variant="body2" textAlign="center">
            {t('auth.hasAccount')}{' '}
            <Link href="/sign-in" style={{ textDecoration: 'none' }}>
              <Typography component="span" variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
                {t('auth.signInLink')}
              </Typography>
            </Link>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
