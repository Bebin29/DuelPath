/**
 * Unit-Tests für Duel-Schema Validierung
 */

import { describe, it, expect } from 'vitest';
import { validateDuelAction } from '@/lib/validations/duel.schema';
import type { DuelAction } from '@/types/duel.types';

describe('duel.schema', () => {
  describe('validateDuelAction', () => {
    it('should validate correct DRAW action', () => {
      const action: DuelAction = {
        type: 'DRAW',
        player: 'PLAYER',
        count: 1,
      };

      const result = validateDuelAction(action);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject DRAW with invalid count', () => {
      const action = {
        type: 'DRAW',
        player: 'PLAYER',
        count: 10, // Zu hoch
      };

      const result = validateDuelAction(action);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate correct NORMAL_SUMMON action', () => {
      const action: DuelAction = {
        type: 'NORMAL_SUMMON',
        player: 'PLAYER',
        cardInstanceId: 'instance-123',
        targetZoneIndex: 2,
      };

      const result = validateDuelAction(action);
      expect(result.ok).toBe(true);
    });

    it('should reject NORMAL_SUMMON with invalid zone index', () => {
      const action = {
        type: 'NORMAL_SUMMON',
        player: 'PLAYER',
        cardInstanceId: 'instance-123',
        targetZoneIndex: 10, // Ungültig
      };

      const result = validateDuelAction(action);
      expect(result.ok).toBe(false);
    });

    it('should validate correct ATTACK action', () => {
      const action: DuelAction = {
        type: 'ATTACK',
        player: 'PLAYER',
        attackerId: 'instance-123',
        target: 'LP',
      };

      const result = validateDuelAction(action);
      expect(result.ok).toBe(true);
    });

    it('should validate ATTACK action with card target', () => {
      const action: DuelAction = {
        type: 'ATTACK',
        player: 'PLAYER',
        attackerId: 'instance-123',
        target: { cardInstanceId: 'target-456' },
      };

      const result = validateDuelAction(action);
      expect(result.ok).toBe(true);
    });

    it('should validate CHANGE_PHASE action', () => {
      const action: DuelAction = {
        type: 'CHANGE_PHASE',
        nextPhase: 'MAIN1',
      };

      const result = validateDuelAction(action);
      expect(result.ok).toBe(true);
    });

    it('should reject invalid action type', () => {
      const action = {
        type: 'INVALID_ACTION',
        player: 'PLAYER',
      };

      const result = validateDuelAction(action);
      expect(result.ok).toBe(false);
    });

    it('should reject action with missing required fields', () => {
      const action = {
        type: 'DRAW',
        // player fehlt
        count: 1,
      };

      const result = validateDuelAction(action);
      expect(result.ok).toBe(false);
    });
  });
});
