'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/components/ui/card';
import { Badge } from '@/components/components/ui/badge';
import { Heart, Minus, Plus } from 'lucide-react';
import type { PlayerId } from '@/types/duel.types';

interface DuelLifePointsProps {
  playerLp: number;
  opponentLp: number;
  winner?: PlayerId;
}

/**
 * Life Points Komponente
 * Zeigt LP von Spieler und Gegner an
 */
export function DuelLifePoints({ playerLp, opponentLp, winner }: DuelLifePointsProps) {
  const { t } = useTranslation();

  const getLpColor = (lp: number) => {
    if (lp <= 1000) return 'text-red-600';
    if (lp <= 4000) return 'text-yellow-600';
    return 'text-green-600';
  };

  const isGameOver = winner !== undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Heart className="w-5 h-5" />
          {t('duel.lifePoints')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gegner LP */}
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-1">{t('duel.opponent')}</div>
          <div className={`text-3xl font-bold ${getLpColor(opponentLp)}`}>{opponentLp}</div>
        </div>

        {/* VS */}
        <div className="text-center text-2xl font-bold text-muted-foreground">VS</div>

        {/* Spieler LP */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${getLpColor(playerLp)}`}>{playerLp}</div>
          <div className="text-sm text-muted-foreground mt-1">{t('duel.you')}</div>
        </div>

        {/* Sieg/Niederlage */}
        {isGameOver && (
          <div className="text-center mt-4">
            <Badge
              variant={winner === 'PLAYER' ? 'default' : 'destructive'}
              className="text-lg px-4 py-2"
            >
              {winner === 'PLAYER' ? t('duel.victory') : t('duel.defeat')}
            </Badge>
          </div>
        )}

        {/* LP-Buttons (für manuelle Anpassung) */}
        {!isGameOver && (
          <div className="flex gap-2 justify-center mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // TODO: LP anpassen - wird später implementiert
                console.log('Decrease LP');
              }}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // TODO: LP anpassen - wird später implementiert
                console.log('Increase LP');
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
