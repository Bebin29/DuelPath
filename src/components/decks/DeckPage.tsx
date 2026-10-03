'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  MoreHorizontal,
  Redo2,
  TriangleAlert,
  Undo2,
  Upload,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n/hooks';
import { useHistory } from '@/lib/hooks/use-history';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { TimedNotice } from '@/components/ui/timed-notice';
import { SaveIndicator } from '@/components/ui/save-indicator';
import { useCardSheet } from '@/components/cards/CardSheet';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  deckIssues,
  sectionCount,
  sectionFor,
  type DeckIssue,
  type Section,
} from '@/lib/deck/deck-rules';
import { applyBanlist, type BanlistKey, type Banlists, type BanlistView } from '@/lib/deck/banlist';
import { expandDeck } from '@/lib/deck/hand-tester';
import { toYdk } from '@/lib/deck/ydk';
import { parseYDKFile } from '@/lib/utils/deck.utils';
import type { LibraryCard, LibraryEntry } from '@/lib/combo/library';
import { importYdkToDeck } from '@/server/actions/deck.actions';
import {
  createDeckVersion,
  deleteDeckVersion,
  getDeckView,
  saveDeck,
  type DeckVersionView,
  type DeckViewCard,
  type DeckViewEntry,
} from '@/server/actions/deck-view.actions';
import { BanlistBar } from './BanlistBar';
import { addDeckGame, deleteDeckGame } from '@/server/actions/deck-game.actions';
import { DeckListTab } from './DeckListTab';
import { DeckCombosTab } from './DeckCombosTab';
import { HandTester } from './HandTester';
import { RatiosTab, type RatioDoc } from './RatiosTab';
import { SidePlanTab } from './SidePlanTab';
import { DeckVersions, type BaselineKey } from './DeckVersions';
import { breakerSet, type Roles } from '@/lib/deck/roles';
import { diffEntries, type SidePlan } from '@/lib/deck/side-plan';
import type { DeckGame, GameInput } from '@/lib/deck/games';

import type { DeckTab } from '@/lib/deck/deck-tab';
import { cn } from '@/lib/utils';
import { PAGE_TITLE, PageHeader } from '@/components/ui/page-header';

interface Doc {
  name: string;
  entries: DeckViewEntry[];
  roles: Roles;
  sidePlans: SidePlan[];
}

/** Anzahl einer Karte in einem Bereich ändern, zwischen 0 und 3 Kopien */
function adjust(
  entries: DeckViewEntry[],
  cardId: string,
  section: Section,
  delta: number
): DeckViewEntry[] {
  if (!entries.some((e) => e.cardId === cardId && e.section === section))
    return delta > 0 ? [...entries, { cardId, section, quantity: Math.min(3, delta) }] : entries;
  return entries.map((e) =>
    e.cardId === cardId && e.section === section
      ? { ...e, quantity: Math.max(0, Math.min(3, e.quantity + delta)) }
      : e
  );
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Deckseite (UI-Plan 7.5.4): Tabs Deckliste, Combos und Hand-Tester, die Adresse enthält den Tab.
 * Änderungen speichern automatisch; Strg+Z nimmt sie zurück, auch einen YDK-Import.
 */
export function DeckPage({
  deck,
  combos,
  comboCards,
  handtraps,
  staples,
  banlists,
  initialTab,
}: {
  deck: {
    id: string;
    name: string;
    entries: DeckViewEntry[];
    cards: DeckViewCard[];
    roles: Roles;
    sidePlans: SidePlan[];
    versions: DeckVersionView[];
    games: DeckGame[];
  };
  combos: LibraryEntry[];
  comboCards: Record<string, LibraryCard>;
  handtraps: string[];
  /** alle Staples, für die Rollen-Vorschläge */
  staples: string[];
  /** aktuelle und, falls gepflegt, nächste Banlist für den Deck-Check */
  banlists: Banlists;
  initialTab: DeckTab;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const cardSheet = useCardSheet();
  const { settings } = useSettings();
  const history = useHistory<Doc>({
    name: deck.name,
    entries: deck.entries,
    roles: deck.roles,
    sidePlans: deck.sidePlans,
  });
  const { name, entries, roles, sidePlans } = history.state;
  // Vergleichsstand der Ratios: beim Öffnen, ein Zwischenstand oder eine Version
  const [baseline, setBaseline] = useState<{ key: BaselineKey; doc: RatioDoc }>({
    key: 'open',
    doc: { entries: deck.entries, roles: deck.roles },
  });
  const [versions, setVersions] = useState(deck.versions);
  const [removed, setRemoved] = useState<{ id: number; version: DeckVersionView } | null>(null);
  // Spiele stehen bewusst außerhalb von Doc: kein Autosave, kein Strg+Z (Deckbau-Plan 3.7)
  const [games, setGames] = useState(deck.games);
  const setDoc = history.set;
  const [cards, setCards] = useState(() => new Map(deck.cards.map((c) => [c.id, c])));
  const [tab, setTab] = useState(initialTab);
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [notice, setNotice] = useState<{ id: number; missing: number } | null>(null);
  // Gegen welche Liste geprüft wird; die nächste Liste nur, wenn es sie gibt
  const [banlistKey, setBanlistKey] = useState<BanlistKey>('current');
  const fileRef = useRef<HTMLInputElement>(null);

  // Autosave wie in der Workbench, kurz nach der letzten Änderung
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      setStatus('saving');
      const result = await saveDeck(deck.id, { name, entries, roles, sidePlans });
      setStatus(result.error ? 'error' : 'saved');
    }, 700);
    return () => clearTimeout(timer);
  }, [deck.id, name, entries, roles, sidePlans]);

  const { undo, redo } = history;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || isTyping(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const changeTab = (next: DeckTab) => {
    setTab(next);
    router.replace(next === 'list' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  };

  const setEntries = useCallback(
    (fn: (prev: DeckViewEntry[]) => DeckViewEntry[]) =>
      setDoc((d) => ({ ...d, entries: fn(d.entries).filter((e) => e.quantity > 0) })),
    [setDoc]
  );
  const change = (cardId: string, section: Section, delta: number) =>
    setEntries((prev) => adjust(prev, cardId, section, delta));
  const add = (card: DeckViewCard, side: boolean) => {
    setCards((prev) => (prev.has(card.id) ? prev : new Map(prev).set(card.id, card)));
    change(card.id, side ? 'SIDE' : sectionFor(card.type), 1);
  };
  // Ein Schritt im Verlauf, damit Strg+Z das Verschieben als Ganzes zurücknimmt
  const move = (cardId: string, from: Section, to: Section) =>
    setEntries((prev) => adjust(adjust(prev, cardId, from, -1), cardId, to, 1));

  // YDK ersetzt das Deck; der Hinweis bietet Rückgängig, Strg+Z geht ebenso
  const importYdk = async (file: File) => {
    const parsed = parseYDKFile(await file.text());
    const result = await importYdkToDeck(deck.id, parsed);
    if (!result.data) return;
    const view = await getDeckView(deck.id);
    if (!view.data) return;
    setCards(new Map(view.data.cards.map((c) => [c.id, c])));
    setDoc((d) => ({ ...d, entries: view.data!.entries }));
    setNotice({ id: Date.now(), missing: result.data.missing.length });
  };
  const exportYdk = () => {
    const blob = new Blob([toYdk(entries, (id) => cards.get(id)?.passcode)], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'deck'}.ydk`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Beim Prüfen gilt die gewählte Liste; die Anzeige der Karten bleibt am aktuellen Stand
  const banlist = banlistKey === 'next' ? banlists.next : banlists.current;
  const checked = useMemo(
    () => (banlistKey === 'next' ? applyBanlist(cards, banlists.next) : cards),
    [cards, banlistKey, banlists.next]
  );
  const issues = useMemo(() => deckIssues(entries, checked), [entries, checked]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries)
      if (e.section !== 'SIDE') map.set(e.cardId, (map.get(e.cardId) ?? 0) + e.quantity);
    return map;
  }, [entries]);
  const pool = useMemo(() => expandDeck(entries.filter((e) => e.section === 'MAIN')), [entries]);
  const handtrapSet = useMemo(() => new Set(handtraps), [handtraps]);
  const stapleSet = useMemo(() => new Set(staples), [staples]);
  const breakers = useMemo(() => breakerSet(settings.breakers), [settings.breakers]);
  const ratioDoc = useMemo(() => ({ entries, roles }), [entries, roles]);
  const diff = useMemo(() => diffEntries(baseline.doc.entries, entries), [baseline, entries]);
  const compare = (key: BaselineKey) => {
    const version = versions.find((v) => v.id === key);
    if (key === 'open') setBaseline({ key, doc: { entries: deck.entries, roles: deck.roles } });
    else if (version) setBaseline({ key, doc: version });
    else setBaseline({ key: 'now', doc: ratioDoc });
  };
  const saveVersion = async (versionName: string, createdAt?: string) => {
    const result = await createDeckVersion(deck.id, {
      name: versionName,
      entries,
      roles,
      createdAt,
    });
    if (!result.data) return false;
    const v = result.data;
    setVersions((prev) => [...prev, v].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    return true;
  };
  const removeVersion = async (id: string) => {
    const version = versions.find((v) => v.id === id);
    if (!version || (await deleteDeckVersion(id)).error) return;
    setVersions((prev) => prev.filter((v) => v.id !== id));
    if (baseline.key === id) compare('open');
    setRemoved({ id: Date.now(), version });
  };
  // Rückgängig legt die Version mit Inhalt und Datum neu an
  const undoRemove = async () => {
    if (!removed) return;
    const { version } = removed;
    setRemoved(null);
    const result = await createDeckVersion(deck.id, version);
    if (result.data)
      setVersions((prev) =>
        [...prev, result.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      );
  };
  // Eintragen und Löschen gehen über eigene Aktionen, nicht über das Autosave der Seite
  const addGame = async (input: GameInput) => {
    const result = await addDeckGame(deck.id, input);
    if (!result.data) return false;
    const game = result.data;
    setGames((prev) => [game, ...prev]);
    return true;
  };
  const removeGame = async (id: string) => {
    if ((await deleteDeckGame(id)).error) return false;
    setGames((prev) => prev.filter((g) => g.id !== id));
    return true;
  };
  const openCard = (id: string) =>
    cardSheet.open(id, (cardId, effects) =>
      setCards((prev) => {
        const card = prev.get(cardId);
        return card ? new Map(prev).set(cardId, { ...card, effects }) : prev;
      })
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        align="start"
        back={
          <Button asChild variant="ghost" size="icon-sm" aria-label={t('decks.back')}>
            <Link href="/decks">
              <ArrowLeft />
            </Link>
          </Button>
        }
        title={
          <input
            value={name}
            onChange={(e) => setDoc((d) => ({ ...d, name: e.target.value }), 'name')}
            aria-label={t('decks.name')}
            className={cn(
              PAGE_TITLE,
              'w-full rounded-md bg-transparent outline-none hover:bg-surface-3/40 focus-visible:bg-surface-3/40'
            )}
          />
        }
        meta={
          <p className="font-mono text-xs">
            {(['MAIN', 'EXTRA', 'SIDE'] as const)
              .map((s) => `${t(`decks.section.${s}`)} ${sectionCount(entries, s)}`)
              .join(' · ')}
          </p>
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={history.undo}
              disabled={!history.canUndo}
              aria-label={t('workbench.undo')}
            >
              <Undo2 />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={history.redo}
              disabled={!history.canRedo}
              aria-label={t('workbench.redo')}
            >
              <Redo2 />
            </Button>
            <SaveIndicator status={status} className="mr-2 w-24" />
            <input
              ref={fileRef}
              type="file"
              accept=".ydk,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importYdk(file);
                e.target.value = '';
              }}
            />
            <Button
              variant="line"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => fileRef.current?.click()}
            >
              <Upload />
              {t('decks.importYdk')}
            </Button>
            <Button
              variant="line"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={exportYdk}
              disabled={entries.length === 0}
            >
              <Download />
              {t('decks.exportYdk')}
            </Button>
            {/* Handy: seltene Aktionen im Menü */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="sm:hidden"
                  aria-label={t('library.actions', { title: name })}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
                  <Upload />
                  {t('decks.importYdk')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportYdk} disabled={entries.length === 0}>
                  <Download />
                  {t('decks.exportYdk')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <BanlistBar
        banlists={banlists}
        value={banlistKey}
        onChange={setBanlistKey}
        issues={issues.length}
      />
      {issues.length > 0 && <IssueList issues={issues} banlist={banlist} />}

      <Tabs<DeckTab>
        id="deck"
        label={t('decks.tabs')}
        value={tab}
        onChange={changeTab}
        options={[
          { value: 'list', label: t('decks.tab.list') },
          { value: 'ratios', label: t('decks.tab.ratios') },
          { value: 'side', label: `${t('decks.tab.side')} · ${sidePlans.length}` },
          { value: 'combos', label: `${t('decks.tab.combos')} · ${combos.length}` },
          { value: 'hand', label: t('decks.tab.hand') },
        ]}
      />
      <div role="tabpanel" id="deck-panel" aria-labelledby={`deck-${tab}`}>
        {tab === 'list' && (
          <DeckListTab
            entries={entries}
            cards={cards}
            onAdd={add}
            onChange={change}
            onMove={move}
            onOpenCard={openCard}
          />
        )}
        {tab === 'ratios' && (
          <RatiosTab
            doc={ratioDoc}
            baseline={baseline.doc}
            cards={cards}
            combos={combos}
            staples={stapleSet}
            breakers={breakers}
            onRoles={(patch) => setDoc((d) => ({ ...d, roles: { ...d.roles, ...patch } }))}
            onChange={change}
            comparison={
              <DeckVersions
                versions={versions}
                baseline={baseline.key}
                diff={diff}
                cards={cards}
                onCompare={compare}
                onSave={saveVersion}
                onRestore={(v) =>
                  setDoc((d) => ({ ...d, entries: v.entries, roles: { ...d.roles, ...v.roles } }))
                }
                onDelete={(id) => void removeVersion(id)}
              />
            }
            onOpenCard={openCard}
          />
        )}
        {tab === 'side' && (
          <SidePlanTab
            entries={entries}
            roles={roles}
            plans={sidePlans}
            cards={cards}
            combos={combos}
            staples={stapleSet}
            breakers={breakers}
            games={games}
            onPlans={(fn, group) => setDoc((d) => ({ ...d, sidePlans: fn(d.sidePlans) }), group)}
            onRoles={(patch) => setDoc((d) => ({ ...d, roles: { ...d.roles, ...patch } }))}
            onAddGame={addGame}
            onDeleteGame={removeGame}
            onOpenCard={openCard}
          />
        )}
        {tab === 'combos' && (
          <DeckCombosTab
            deckId={deck.id}
            deckName={name}
            combos={combos}
            cards={comboCards}
            counts={counts}
          />
        )}
        {tab === 'hand' && (
          <HandTester
            deckId={deck.id}
            pool={pool}
            cards={cards}
            combos={combos}
            handtraps={handtrapSet}
          />
        )}
      </div>

      {notice && (
        <TimedNotice
          key={notice.id}
          duration={8000}
          onExpire={() => setNotice(null)}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 shadow-[0_18px_40px_rgb(0_0_0/0.45)]"
        >
          <span className="mr-2 text-sm">
            {t('decks.imported')}
            {notice.missing > 0 && ` · ${t('decks.unknownCodes', { count: notice.missing })}`}
          </span>
          <Button
            variant="text"
            size="sm"
            onClick={() => {
              history.undo();
              setNotice(null);
            }}
          >
            {t('workbench.undo')}
          </Button>
        </TimedNotice>
      )}
      {removed && (
        <TimedNotice
          key={removed.id}
          duration={8000}
          onExpire={() => setRemoved(null)}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 shadow-[0_18px_40px_rgb(0_0_0/0.45)]"
        >
          <span className="mr-2 text-sm">
            {t('decks.versions.deleted', { name: removed.version.name })}
          </span>
          <Button variant="text" size="sm" onClick={() => void undoRemove()}>
            {t('workbench.undo')}
          </Button>
        </TimedNotice>
      )}
    </div>
  );
}

/** Regelhinweise knapp über den Tabs; die App verbietet nichts, sie sagt es */
function IssueList({ issues, banlist }: { issues: DeckIssue[]; banlist: BanlistView | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const shown = open ? issues : issues.slice(0, 2);
  // Beim Prüfen gegen die nächste Liste steht deren Name im Hinweis
  const banlistKey = banlist?.key === 'next' ? 'decks.issue.banlistNamed' : 'decks.issue.banlist';
  return (
    <ul className="flex flex-col gap-1 rounded-md border border-warning/40 bg-warning-tint px-3 py-2 text-sm text-warning">
      {shown.map((issue, i) => (
        <li key={i} className="flex items-center gap-2">
          <TriangleAlert className="size-3.5 shrink-0" />
          {t(issue.kind === 'banlist' ? banlistKey : `decks.issue.${issue.kind}`, {
            ...issue,
            ...(banlist && { list: banlist.name }),
            ...('section' in issue && { section: t(`decks.section.${issue.section}`) }),
          })}
        </li>
      ))}
      {issues.length > 2 && (
        <li>
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs underline">
            {open ? t('decks.less') : t('decks.moreIssues', { count: issues.length - 2 })}
          </button>
        </li>
      )}
    </ul>
  );
}
