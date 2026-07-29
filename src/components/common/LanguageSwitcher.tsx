import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const isFr = i18n.language?.startsWith('fr');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 text-sm font-bold gap-1"
          aria-label={t('language.label')}
          title={t('language.label')}
        >
          <span className="text-base">{isFr ? '🇫🇷' : '🇬🇧'}</span>
          <span>{isFr ? 'FR' : 'EN'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          className={`gap-2 cursor-pointer ${isFr ? 'font-bold text-primary' : ''}`}
          onClick={() => i18n.changeLanguage('fr')}
        >
          <span className="text-base">🇫🇷</span> Français
        </DropdownMenuItem>
        <DropdownMenuItem
          className={`gap-2 cursor-pointer ${!isFr ? 'font-bold text-primary' : ''}`}
          onClick={() => i18n.changeLanguage('en')}
        >
          <span className="text-base">🇬🇧</span> English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
