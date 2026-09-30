'use client';

import { useMemo } from 'react';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { NODE_HEIGHT, NODE_WIDTH, layoutTree } from '@/lib/combo/layout';
import { START_ID } from '@/lib/combo/tree';
import { warningsOf, type ComboNodeData, type GameState } from '@/lib/combo/state';
import { displayName, type ComboCard } from '@/lib/combo/cards';

interface StepData extends Record<string, unknown> {
  title: string;
  subtitle: string;
  image: string | null;
  opponent: boolean;
  badge?: string;
  warnings: number;
  selected: boolean;
  variant: ComboNodeData['kind'] | 'START';
}

type StepNode = Node<StepData, 'step'>;

const nodeTypes = { step: StepNodeView };

interface ComboCanvasProps {
  nodes: ComboNodeData[];
  states: Map<string, GameState>;
  cards: Map<string, ComboCard>;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ComboCanvas({ nodes, states, cards, selectedId, onSelect }: ComboCanvasProps) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();

  const { flowNodes, flowEdges } = useMemo(() => {
    const items = [
      { id: START_ID, parentId: null },
      ...nodes.map((n) => ({ id: n.id, parentId: n.parentId ?? START_ID })),
    ];
    const positions = layoutTree(items);

    const flowNodes: StepNode[] = [
      {
        id: START_ID,
        type: 'step',
        position: positions.get(START_ID)!,
        data: {
          title: t('combo.start'),
          subtitle: '',
          image: null,
          opponent: false,
          warnings: 0,
          selected: selectedId === START_ID,
          variant: 'START',
        },
      },
      ...nodes.map((node): StepNode => {
        const state = states.get(node.id);
        const card = node.cardId ? cards.get(node.cardId) : undefined;
        const chainLength = state?.chain.length ?? 0;
        const badge =
          node.kind === 'ACTIVATE'
            ? t('combo.chainLink', { n: chainLength })
            : chainLength > 0
              ? t('combo.openChain', { count: chainLength })
              : undefined;
        return {
          id: node.id,
          type: 'step',
          position: positions.get(node.id)!,
          data: {
            title: card ? displayName(card, cardLanguage) : t(`combo.kind.${node.kind}`),
            subtitle: card
              ? t(`combo.kind.${node.kind}`)
              : node.action
                ? t(`combo.action.${node.action}`)
                : '',
            image: card?.imageSmall ?? null,
            opponent: node.player === 'opponent' || node.kind === 'OPPONENT',
            badge,
            warnings: warningsOf(state, node.id).length,
            selected: node.id === selectedId,
            variant: node.kind,
          },
        };
      }),
    ];

    const flowEdges: Edge[] = nodes.map((node) => ({
      id: `${node.parentId ?? START_ID}->${node.id}`,
      source: node.parentId ?? START_ID,
      target: node.id,
      label: node.edgeLabel ?? undefined,
      type: 'smoothstep',
    }));
    return { flowNodes, flowEdges };
  }, [nodes, states, cards, selectedId, t, cardLanguage]);

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      onNodeClick={(_, node) => onSelect(node.id)}
      fitView
      fitViewOptions={{ maxZoom: 1 }}
      minZoom={0.2}
    >
      <Background />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => ((n.data as StepData).opponent ? '#f87171' : '#94a38f')}
      />
    </ReactFlow>
  );
}

function StepNodeView({ data }: NodeProps<StepNode>) {
  return (
    <div
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      className={cn(
        'flex items-center gap-2 rounded-lg border-2 bg-card p-2 text-left shadow-sm',
        data.opponent ? 'border-red-400' : 'border-primary/60',
        data.variant === 'START' && 'border-dashed',
        data.variant === 'RESOLVE' && 'bg-muted',
        data.selected && 'ring-4 ring-ring'
      )}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      {data.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- kleine Vorschau aus dem lokalen Bild-Cache
        <img src={data.image} alt="" className="h-16 w-11 shrink-0 rounded object-cover" />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{data.title}</div>
        {data.subtitle && (
          <div className="truncate text-xs text-muted-foreground">{data.subtitle}</div>
        )}
        <div className="mt-1 flex items-center gap-1 text-xs">
          {data.badge && <span className="rounded bg-secondary px-1">{data.badge}</span>}
          {data.warnings > 0 && (
            <span className="flex items-center gap-0.5 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {data.warnings}
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}
