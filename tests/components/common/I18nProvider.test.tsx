import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import i18n from '@/lib/i18n/config';
import { useTranslation } from '@/lib/i18n/hooks';
import { I18nProvider } from '@/components/common/I18nProvider';

function Probe() {
  const { t } = useTranslation();
  return <span>{t('start.recent')}</span>;
}

describe('I18nProvider', () => {
  it('rendert schon auf dem Server in der Sprache aus dem Cookie', () => {
    const html = renderToString(
      <I18nProvider language="en">
        <Probe />
      </I18nProvider>
    );
    expect(html).toContain('Recently edited');
  });

  it('hält die Sprache je Anfrage getrennt und lässt die globale Instanz in Ruhe', () => {
    const html = renderToString(
      <>
        <I18nProvider language="en">
          <Probe />
        </I18nProvider>
        <I18nProvider language="de">
          <Probe />
        </I18nProvider>
      </>
    );
    expect(html).toContain('Recently edited');
    expect(html).toContain('Zuletzt bearbeitet');
    expect(i18n.language).toBe('de');
  });
});
