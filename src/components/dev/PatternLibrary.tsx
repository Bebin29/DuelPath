'use client';

import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CardView, type CardSize } from '@/components/cards/CardView';
import { AmSpieltisch } from '@/components/illustrations/AmSpieltisch';
import { cn } from '@/lib/utils';

const img = (passcode: string) => `/api/card-images/${passcode}_small.jpg`;
const ALUBER = img('62962630');

const SURFACES = [
  'bg',
  'surface-1',
  'surface-2',
  'surface-3',
  'felt',
  'line',
  'line-strong',
  'zone',
];
const TEXT = ['ink', 'text-muted', 'text-subtle'];
const MEANINGS = [
  ['self', 'eigene Seite'],
  ['opponent', 'Gegner, Choke Points'],
  ['chain', 'Chain'],
  ['warning', 'Warnung'],
  ['jev', 'Jev'],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-10 w-full rounded-md border border-line"
        style={{ background: `var(--${name})` }}
      />
      <span className="font-mono text-2xs text-text-subtle">{name}</span>
    </div>
  );
}

function Theme({ mode }: { mode: 'dark' | 'light' }) {
  return (
    <div
      className={cn(mode, 'flex flex-col gap-10 rounded-xl border border-line bg-bg p-8 text-ink')}
    >
      <p className="font-mono text-xs text-text-subtle">
        {mode === 'dark' ? 'Dunkel (Standard)' : 'Hell'}
      </p>

      <Section title="Flächen und Text">
        <div className="grid grid-cols-4 gap-3">
          {[...SURFACES, ...TEXT].map((s) => (
            <Swatch key={s} name={s} />
          ))}
        </div>
      </Section>

      <Section title="Bedeutungen">
        <div className="flex flex-wrap gap-2">
          {MEANINGS.map(([name, label]) => (
            <span
              key={name}
              className="rounded-sm px-2 py-0.5 font-mono text-xs"
              style={{ background: `var(--${name}-tint)`, color: `var(--${name})` }}
            >
              {label}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Schrift">
        <div className="flex flex-col gap-2">
          <span className="font-display text-[40px] leading-none">Aluber 1-Card</span>
          <span className="font-display text-2xl italic text-opponent">Ash?</span>
          <span className="text-base">
            Kartentext in Instrument Sans, 14 px, für den Inspector.
          </span>
          <span className="text-sm text-text-muted">Standard in der Workbench, 13 px.</span>
          <span className="font-mono text-xs text-text-subtle">
            HOPT · genutzt 2 / 9 CL1 1800 / 0
          </span>
          <span className="font-hand text-[15px] text-opponent">
            Ash hier? Tragedy als Extender.
          </span>
        </div>
      </Section>

      <Section title="Knöpfe">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            Auflösen <Kbd>⏎</Kbd>
          </Button>
          <Button variant="line">
            Neue Combo <Kbd>N</Kbd>
          </Button>
          <Button variant="text">
            Chainen <Kbd>C</Kbd>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Rückgängig">
            <Undo2 />
          </Button>
          <Button variant="destructive">Combo löschen</Button>
          <Button size="sm">Klein</Button>
          <Button disabled>Deaktiviert</Button>
        </div>
        <div className="flex gap-2">
          <Kbd keycap>Strg</Kbd>
          <Kbd keycap>K</Kbd>
          <Kbd keycap>⏎</Kbd>
        </div>
      </Section>

      <Section title="Menü">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="line" className="self-start">
              Aktionen öffnen
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={mode} align="start">
            <DropdownMenuLabel>Aluber the Jester of Despia</DropdownMenuLabel>
            <DropdownMenuItem>
              ① Suche Branded <span className="ml-auto font-mono text-2xs text-jev">frei</span>{' '}
              <Kbd>1</Kbd>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Position ändern <Kbd className="ml-auto">P</Kbd>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Auf den Friedhof <Kbd className="ml-auto">G</Kbd>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>

      <Section title="Karten: Größen">
        <div className="flex flex-wrap items-end gap-4">
          {(['art', 'xs', 'sm', 'board', 'lg'] as CardSize[]).map((s) => (
            <div key={s} className="flex flex-col items-center gap-1.5">
              <CardView image={ALUBER} label={`Aluber, Größe ${s}`} size={s} />
              <span className="font-mono text-2xs text-text-subtle">{s}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Karten: Zustände">
        <div className="flex flex-wrap items-center gap-6 bg-felt p-5">
          {[
            ['normal', {}],
            ['ausgewählt', { selected: true }],
            ['neu', { isNew: 'self' as const }],
            ['CL2', { chainLink: 2 }],
            ['negiert', { negated: true }],
            ['Warnung', { warning: true }],
            ['gesetzt', { faceDown: 'self' as const }],
            ['Gegner gesetzt', { faceDown: 'opponent' as const }],
            ['Verteidigung', { defense: true }],
            ['gedimmt', { dimmed: true }],
            ['Xyz 2', { materials: 2 }],
          ].map(([label, props]) => (
            <div key={label as string} className="flex w-20 flex-col items-center gap-2">
              <div className="grid h-24 place-items-center">
                <CardView image={ALUBER} label={`Aluber, ${label}`} {...(props as object)} />
              </div>
              <span className="text-center font-mono text-2xs text-text-subtle">
                {label as string}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Illustration">
        <AmSpieltisch title="Zwei Spieler am Tisch" className="h-auto w-80" />
      </Section>
    </div>
  );
}

export function PatternLibrary() {
  return (
    <main id="main" className="mx-auto flex max-w-[1600px] flex-col gap-8 p-10">
      <header>
        <h1 className="font-display text-5xl">Musterseite</h1>
        <p className="mt-2 text-text-muted">
          Tokens und Komponenten in beiden Designs (UI-Plan 13.1). Nur in der Entwicklung.
        </p>
      </header>
      <div className="grid gap-8 xl:grid-cols-2">
        <Theme mode="dark" />
        <Theme mode="light" />
      </div>
    </main>
  );
}
