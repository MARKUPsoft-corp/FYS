import i18n from '@/i18n';
import type { HeroSlide } from '@/entities';

export function localizedFruitName(fruit: { name: string; nameEn?: string }): string {
  if (i18n.language?.startsWith('en') && fruit.nameEn) {
    return fruit.nameEn;
  }
  return fruit.name;
}

export function isEnglish(): boolean {
  return i18n.language?.startsWith('en') ?? false;
}

export function localizedSlideText(slide: HeroSlide, field: 'label' | 'title' | 'highlight' | 'titleEnd' | 'cta'): string {
  if (isEnglish()) {
    const enField = `${field}En` as keyof HeroSlide;
    const enValue = slide[enField];
    if (typeof enValue === 'string' && enValue.length > 0) return enValue;
  }
  return slide[field];
}
