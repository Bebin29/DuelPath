import type { Prisma } from '@/generated/prisma/client';
import { sortByDepth } from '@/lib/combo/cards';
import type { ComboNodeData } from '@/lib/combo/state';

const json = (value: unknown) => (value ?? undefined) as Prisma.InputJsonValue | undefined;

/** Knoten als Datenbankzeilen, Eltern vor Kindern; JSON-Felder ohne Wert bleiben leer */
export function nodeRows(comboId: string, nodes: ComboNodeData[]) {
  return sortByDepth(nodes).map((node) => {
    const { importCheck, ...n } = node;
    void importCheck;
    return {
      ...n,
      comboId,
      costMoves: (n.costMoves ?? []) as unknown as Prisma.InputJsonValue,
      resolveMoves: (n.resolveMoves ?? []) as unknown as Prisma.InputJsonValue,
      negates: json(n.negates),
      targets: json(n.targets),
      ignoredHits: json(n.ignoredHits),
      interruptions: json(n.interruptions),
    };
  });
}
