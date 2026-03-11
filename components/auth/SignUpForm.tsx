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
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Image from 'next/image';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyAuthError } from '@/lib/firebase/auth';
import { signUpSchema, type SignUpFormData } from '@/lib/schemas/authSchemas';
import PasswordStrengthBar from './PasswordStrengthBar';
import icon from "@/public/icon.png";


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
      <IconButton onClick={toggle} edge="end" aria-label="Toggle password visibility" size="small">
        {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
      </IconButton>
    </InputAdornment>
  );

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
        {t('auth.signUp')}
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
            {...register('username')}
            label={t('auth.username')}
            fullWidth
            error={!!errors.username}
            helperText={errors.username?.message}
            autoComplete="username"
          />

          {/* Avatar upload */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={avatarPreview || undefined}
              sx={{ width: 48, height: 48, bgcolor: 'action.selected' }}
            >
              <PhotoCameraIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            </Avatar>
            <Button
              variant="outlined"
              component="label"
              size="small"
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              {t('auth.avatar')}
              <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
            </Button>
          </Box>

          <TextField
            {...register('password')}
            label={t('auth.password')}
            type={showPassword ? 'text' : 'password'}
            fullWidth
            error={!!errors.password}
            helperText={errors.password?.message}
            autoComplete="new-password"
            slotProps={{
              input: { endAdornment: passwordAdornment(showPassword, () => setShowPassword(!showPassword)) },
            }}
          />

          <Box sx={{ mt: -1 }}>
            <PasswordStrengthBar password={passwordValue} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {t('auth.passwordConstraints')}
            </Typography>
          </Box>

          <TextField
            {...register('confirmPassword')}
            label={t('auth.confirmPassword')}
            type={showConfirmPassword ? 'text' : 'password'}
            fullWidth
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
        </Stack>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          sx={{ mt: 3, mb: 3, borderRadius: 2, py: 1.5, fontWeight: 600, textTransform: 'none', fontSize: '1rem' }}
        >
          {loading ? t('common.loading') : t('auth.signUp')}
        </Button>

        <Divider sx={{ mb: 2.5 }} />

        <Typography variant="body2" textAlign="center" color="text.secondary">
          {t('auth.hasAccount')}{' '}
          <Link href="/sign-in" style={{ textDecoration: 'none' }}>
            <Typography component="span" variant="body2" color="primary" fontWeight={600} sx={{ cursor: 'pointer' }}>
              {t('auth.signInLink')}
            </Typography>
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
