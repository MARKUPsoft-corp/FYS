import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@rasenganjs/theme';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ButtonTheme() {
  const { t } = useTranslation();
  const { actualTheme, setTheme } = useTheme();

  const toggle = () => {
    setTheme(actualTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={t('theme.switch')}
        >
          {actualTheme === 'dark' ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {actualTheme === 'dark' ? t('theme.light') : t('theme.dark')}
      </TooltipContent>
    </Tooltip>
  );
}
