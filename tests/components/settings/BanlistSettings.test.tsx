import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

const actions = vi.hoisted(() => ({
  setDate: vi.fn().mockResolvedValue({ data: true }),
  saveNext: vi.fn().mockResolvedValue({ data: true }),
}));
vi.mock('@/server/actions/banlist.actions', () => ({
  setCurrentBanlistDate: actions.setDate,
  saveNextBanlist: actions.saveNext,
  deleteNextBanlist: vi.fn(),
}));
vi.mock('@/components/providers/SettingsProvider', () => ({ useCardLanguage: () => 'en' }));
vi.mock('@/components/decks/CardSearchPanel', () => ({ CardSearchPanel: () => null }));

import { BanlistSettings } from '@/components/settings/BanlistSettings';

describe('BanlistSettings Autosave', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('speichert beim Öffnen nichts, auch im Strict Mode, und eine Änderung genau einmal', async () => {
    vi.useFakeTimers();
    render(
      <StrictMode>
        <BanlistSettings current={null} next={null} />
      </StrictMode>
    );
    await act(async () => vi.advanceTimersByTime(1000));
    expect(actions.setDate).not.toHaveBeenCalled();
    expect(screen.queryByText('Speichern fehlgeschlagen')).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue(''), { target: { value: '2026-10-01' } });
    await act(async () => vi.advanceTimersByTime(1000));
    expect(actions.setDate).toHaveBeenCalledTimes(1);
    expect(actions.setDate).toHaveBeenCalledWith('2026-10-01');
  });
});
