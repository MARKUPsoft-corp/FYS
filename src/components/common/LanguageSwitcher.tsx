import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
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
          size="sm"
          className="h-10 px-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 text-xs font-bold gap-1.5"
          aria-label={t('language.label')}
          title={t('language.label')}
        >
          <Globe className="size-4 text-primary" />
          <span>{isFr ? 'FR' : 'EN'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          className={`gap-2 cursor-pointer text-xs ${isFr ? 'font-bold text-primary' : ''}`}
          onClick={() => i18n.changeLanguage('fr')}
        >
          Français
        </DropdownMenuItem>
        <DropdownMenuItem
          className={`gap-2 cursor-pointer text-xs ${!isFr ? 'font-bold text-primary' : ''}`}
          onClick={() => i18n.changeLanguage('en')}
        >
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
