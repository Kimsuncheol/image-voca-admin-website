'use client';

import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { useThemeMode } from '@/context/ThemeContext';

const modes = ['light', 'dark', 'system'] as const;

const modeIcons = {
  light: <LightModeIcon />,
  dark: <DarkModeIcon />,
  system: <SettingsBrightnessIcon />,
};

const modeLabels = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export default function ThemeToggle() {
  const { mode, setMode } = useThemeMode();

  const handleToggle = () => {
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  };

  return (
    <Tooltip title={modeLabels[mode]}>
      <IconButton onClick={handleToggle} color="inherit" aria-label="Toggle theme">
        {modeIcons[mode]}
      </IconButton>
    </Tooltip>
  );
}
