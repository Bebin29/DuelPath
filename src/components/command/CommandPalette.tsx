'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import {
  BookOpen,
  Keyboard,
  Layers,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage, useSettings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/kbd';
import { CardView } from '@/components/cards/CardView';
import { useCardSheet } from '@/components/cards/CardSheet';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { KEY_WORDS, SHORTCUT_GROUPS } from '@/lib/shortcuts';
import { paletteIndex, type PaletteIndex } from '@/server/actions/palette.actions';
import { createDeck } from '@/server/actions/deck.actions';

export interface PaletteItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  image?: string | null;
  icon?: LucideIcon;
  keywords?: string[];
  /** Ausgegraut und nicht ausführbar, mit Grund im Hinweis */
  disabled?: boolean;
  run: () => void;
}

/** Weitere Einträge je Seite, etwa Befehle der Workbench; sie filtern selbst nach der Eingabe */
export type PaletteSource = (query: string) => PaletteItem[];

interface PaletteApi {
  open: (query?: string) => void;
  openHelp: () => void;
  register: (id: string, source: PaletteSource) => () => void;
}

const PaletteContext = createContext<PaletteApi>({
  open: () => {},
  openHelp: () => {},
  register: () => () => {},
});
export const usePalette = () => useContext(PaletteContext);

/** Hängt eine Quelle ein, solange die Komponente lebt */
export function usePaletteSource(id: string, source: PaletteSource) {
  const { register } = usePalette();
  const ref = useRef(source);
  useEffect(() => {
    ref.current = source;
  });
  useEffect(() => register(id, (q) => ref.current(q)), [id, register]);
}

const RECENT_KEY = 'duelpath-palette-recent';
type Recent = { id: string; group: string; label: string; href: string; image?: string | null };

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Befehlspalette (UI-Plan 7.4.3): Strg+K öffnet überall Aktionen, Combos, Decks und Karten.
 * Leer zeigt sie die zuletzt benutzten Einträge. „?“ öffnet die Tastaturhilfe (7.4.6).
 */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [initial, setInitial] = useState('');
  const [sources, setSources] = useState(() => new Map<string, PaletteSource>());

  const api = useMemo<PaletteApi>(
    () => ({
      open: (query = '') => {
        setInitial(query);
        setOpen(true);
      },
      openHelp: () => setHelp(true),
      register: (id, source) => {
        setSources((prev) => new Map(prev).set(id, source));
        return () =>
          setSources((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
      },
    }),
    []
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setInitial('');
        setOpen((o) => !o);
      } else if (e.key === '?' && !isTyping(e.target) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setHelp((h) => !h);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <PaletteContext.Provider value={api}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-[14vh] z-50 w-[600px] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-lg border border-line bg-surface-2 shadow-[0_24px_60px_rgb(0_0_0/0.55)] outline-none"
          >
            {open && (
              <Palette
                initial={initial}
                sources={sources}
                onClose={() => setOpen(false)}
                onHelp={() => {
                  setOpen(false);
                  setHelp(true);
                }}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <KeyboardHelp open={help} onOpenChange={setHelp} />
    </PaletteContext.Provider>
  );
}

function Palette({
  initial,
  sources,
  onClose,
  onHelp,
}: {
  initial: string;
  sources: Map<string, PaletteSource>;
  onClose: () => void;
  onHelp: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const cardLanguage = useCardLanguage();
  const { settings, update } = useSettings();
  const cardSheet = useCardSheet();
  const [query, setQuery] = useState(initial);
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<PaletteIndex | null>(null);
  const [cards, setCards] = useState<PaletteItem[]>([]);
  const [recent, setRecent] = useState<Recent[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as Recent[];
    } catch {
      return [];
    }
  });
  const debounced = useDebounce(query.trim(), 200);

  useEffect(() => {
    void paletteIndex().then(setIndex);
  }, []);

  // Karten per Suche, mit Spitznamen und Kürzeln wie überall
  useEffect(() => {
    if (debounced.length < 2 || debounced.includes(' ')) return;
    const controller = new AbortController();
    fetch(`/api/cards?name=${encodeURIComponent(debounced)}&limit=6`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then(
        (data: {
          cards?: {
            id: string;
            name: string;
            nameDe?: string | null;
            imageSmall?: string | null;
            type: string;
          }[];
        }) =>
          setCards(
            (data.cards ?? []).map((c) => ({
              id: `card:${c.id}`,
              group: 'cards',
              label: (cardLanguage === 'de' && c.nameDe) || c.name,
              hint: c.type,
              image: c.imageSmall,
              run: () => cardSheet.open(c.id),
            }))
          )
      )
      .catch(() => {});
    return () => controller.abort();
  }, [debounced, cardLanguage, cardSheet]);

  const remember = (entry: Recent) => {
    const next = [entry, ...recent.filter((r) => r.id !== entry.id)].slice(0, 6);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };
  const go = (entry: Recent) => () => {
    remember(entry);
    router.push(entry.href);
  };

  const items = useMemo((): PaletteItem[] => {
    const q = query.trim().toLowerCase();
    const fromSources = [...sources.values()].flatMap((s) => s(query));
    const actions: PaletteItem[] = [
      ...(index?.decks ?? []).map((d) => ({
        id: `new:${d.id}`,
        group: 'actions',
        label: t('palette.newCombo', { deck: d.name }),
        icon: Plus,
        keywords: ['neue combo', 'new combo', d.name],
        run: go({
          id: `new:${d.id}`,
          group: 'actions',
          label: t('palette.newCombo', { deck: d.name }),
          href: `/combos/new?deck=${d.id}`,
        }),
      })),
      {
        id: 'new-deck',
        group: 'actions',
        label: t('decks.new'),
        icon: Plus,
        keywords: ['deck', 'neues deck', 'new deck'],
        run: async () => {
          const result = await createDeck({ name: t('decks.untitled'), format: 'TCG' });
          if (result.deck) router.push(`/decks/${result.deck.id}`);
        },
      },
      {
        id: 'theme',
        group: 'actions',
        label: settings.theme === 'dark' ? t('palette.lightTheme') : t('palette.darkTheme'),
        icon: settings.theme === 'dark' ? Sun : Moon,
        keywords: ['design', 'theme', 'hell', 'dunkel', 'light', 'dark'],
        run: () => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' }),
      },
      {
        id: 'card-language',
        group: 'actions',
        label: t('palette.cardLanguage'),
        icon: BookOpen,
        keywords: ['sprache', 'language', 'deutsch', 'english'],
        run: () => update({ cardLanguage: settings.cardLanguage === 'de' ? 'en' : 'de' }),
      },
      {
        id: 'settings',
        group: 'actions',
        label: t('navigation.settings'),
        icon: Settings,
        run: go({
          id: 'settings',
          group: 'actions',
          label: t('navigation.settings'),
          href: '/settings',
        }),
      },
      {
        id: 'help',
        group: 'actions',
        label: t('help.title'),
        icon: Keyboard,
        keywords: ['tastatur', 'kürzel', 'shortcuts', 'keys'],
        run: onHelp,
      },
    ];
    const combos: PaletteItem[] = (index?.combos ?? []).map((c) => ({
      id: `combo:${c.id}`,
      group: 'combos',
      label: c.title,
      hint: c.deckName ?? undefined,
      icon: Swords,
      run: go({ id: `combo:${c.id}`, group: 'combos', label: c.title, href: `/combos/${c.id}` }),
    }));
    const decks: PaletteItem[] = (index?.decks ?? []).map((d) => ({
      id: `deck:${d.id}`,
      group: 'decks',
      label: d.name,
      icon: Layers,
      run: go({ id: `deck:${d.id}`, group: 'decks', label: d.name, href: `/decks/${d.id}` }),
    }));

    if (!q) {
      const recentItems: PaletteItem[] = recent.map((r) => ({
        id: `recent:${r.id}`,
        group: 'recent',
        label: r.label,
        icon: r.group === 'decks' ? Layers : r.group === 'combos' ? Swords : undefined,
        run: go(r),
      }));
      const suggested = [
        ...actions.filter((a) => a.id.startsWith('new:')).slice(0, 1),
        ...actions.filter((a) => a.id === 'settings' || a.id === 'help'),
      ];
      return [...fromSources, ...recentItems, ...suggested];
    }
    const hit = (item: PaletteItem) =>
      [item.label, item.hint ?? '', ...(item.keywords ?? [])].some((w) =>
        w.toLowerCase().includes(q)
      );
    return [
      ...fromSources,
      ...actions.filter(hit),
      ...combos.filter(hit).slice(0, 6),
      ...decks.filter(hit).slice(0, 4),
      ...(debounced.length >= 2 && !debounced.includes(' ') ? cards : []),
    ];
    // go und remember hängen nur an recent und router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, index, cards, recent, sources, settings, debounced, t]);

  const selectable = items.filter((i) => !i.disabled);
  const current = selectable[Math.min(active, selectable.length - 1)];
  const run = (item: PaletteItem | undefined) => {
    if (!item || item.disabled) return;
    onClose();
    item.run();
  };

  const groups = [...new Set(items.map((i) => i.group))];

  return (
    <>
      <Dialog.Title className="sr-only">{t('palette.title')}</Dialog.Title>
      <label className="flex items-center gap-2.5 border-b border-line px-4">
        <Search className="size-4 text-text-subtle" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((i) => Math.min(i + 1, selectable.length - 1));
            else if (e.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0));
            else if (e.key === 'Enter') run(current);
            else return;
            e.preventDefault();
          }}
          placeholder={t('palette.placeholder')}
          aria-label={t('palette.placeholder')}
          role="combobox"
          aria-expanded
          aria-controls="palette-list"
          aria-activedescendant={current ? `palette-${current.id}` : undefined}
          className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-text-subtle"
        />
        <Kbd>Esc</Kbd>
      </label>
      <div id="palette-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-1.5">
        {items.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-text-subtle">{t('palette.empty')}</p>
        )}
        {groups.map((group) => (
          <div key={group} role="group" aria-label={t(`palette.group.${group}`)}>
            <p className="px-2.5 pb-1 pt-2 font-mono text-2xs text-text-subtle">
              {t(`palette.group.${group}`)}
            </p>
            {items
              .filter((i) => i.group === group)
              .map((item) => {
                const Icon = item.icon;
                const isActive = item === current;
                return (
                  <div
                    key={item.id}
                    id={`palette-${item.id}`}
                    role="option"
                    aria-selected={isActive}
                    aria-disabled={item.disabled}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      run(item);
                    }}
                    onMouseEnter={() => !item.disabled && setActive(selectable.indexOf(item))}
                    className={cn(
                      'flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm',
                      isActive && 'bg-ink/9 shadow-[inset_2px_0_0_var(--ink)]',
                      item.disabled && 'cursor-default opacity-50'
                    )}
                  >
                    {item.image !== undefined ? (
                      <CardView image={item.image} label="" size="art" />
                    ) : Icon ? (
                      <Icon className="size-4 text-text-subtle" />
                    ) : (
                      <span className="size-4" />
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.hint && (
                      <span className="truncate font-mono text-2xs text-text-subtle">
                        {item.hint}
                      </span>
                    )}
                    {isActive && <Kbd>⏎</Kbd>}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
      <p className="border-t border-line px-4 py-2 font-mono text-2xs text-text-subtle">
        {t('palette.footer')}
      </p>
    </>
  );
}

/** Tastaturhilfe (UI-Plan 7.4.6): alle Kürzel in Gruppen, durchsuchbar */
function KeyboardHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const keyLabel = useCallback(
    (key: string) => (KEY_WORDS.includes(key) ? t(`help.key.${key}`) : key),
    [t]
  );
  const q = query.trim().toLowerCase();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setQuery('');
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[8vh] z-50 flex max-h-[84vh] w-[760px] max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col rounded-lg border border-line bg-surface-2 shadow-[0_24px_60px_rgb(0_0_0/0.55)] outline-none"
        >
          <header className="flex items-center gap-3 border-b border-line px-5 py-3">
            <Dialog.Title className="flex-1 font-display text-2xl">{t('help.title')}</Dialog.Title>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('help.search')}
              aria-label={t('help.search')}
              className="h-8 w-56 rounded-md border border-line bg-transparent px-2.5 text-sm outline-none placeholder:text-text-subtle focus:border-line-strong"
            />
            <Kbd>Esc</Kbd>
          </header>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 overflow-y-auto p-5">
            {SHORTCUT_GROUPS.map((group) => {
              const items = group.items.filter(
                (s) =>
                  !q ||
                  t(`help.keys.${s.id}`).toLowerCase().includes(q) ||
                  s.keys.some((k) => keyLabel(k).toLowerCase() === q)
              );
              if (!items.length) return null;
              return (
                <section key={group.id}>
                  <h3 className="mb-1.5 font-display text-lg">{t(`help.group.${group.id}`)}</h3>
                  <ul className="flex flex-col">
                    {items.map((s) => (
                      <li
                        key={s.id}
                        className="flex min-h-8 items-center gap-3 border-b border-line text-sm"
                      >
                        <span className="flex-1 text-text-muted">{t(`help.keys.${s.id}`)}</span>
                        <span className="flex gap-1">
                          {s.keys.map((k, i) => (
                            <Kbd key={i} keycap>
                              {keyLabel(k)}
                            </Kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
