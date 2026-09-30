'use client';

import { useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
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
import { TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import { layoutTree } from '@/lib/combo/layout';
import { childrenOf } from '@/lib/combo/lines';
import { START_ID } from '@/lib/combo/tree';
import type { ComboNodeData } from '@/lib/combo/state';

export const TREE_NODE_WIDTH = 224;

interface TreeNodeData extends Record<string, unknown> {
  label: string;
  detail: string;
  image: string | null;
  opponent: boolean;
  warnings: number;
  selected: boolean;
  onPath: boolean;
  start: boolean;
}

type TreeNode = Node<TreeNodeData, 'step'>;
const nodeTypes = { step: TreeNodeView };

interface TreeCanvasProps {
  nodes: ComboNodeData[];
  selectedId: string;
  /** Pfad von der Wurzel bis zum gewählten Knoten, wird hervorgehoben */
  path: Set<string>;
  labelOf: (node: ComboNodeData) => string;
  detailOf: (node: ComboNodeData) => string;
  imageOf: (node: ComboNodeData) => string | null;
  warningsOf: (nodeId: string) => number;
  startLabel: string;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

/** Baum-Modus (UI-Plan 7.3): Hauptline als gerade Achse, Pfad zum gewählten Schritt hervorgehoben */
export function TreeCanvas({
  nodes,
  selectedId,
  path,
  labelOf,
  detailOf,
  imageOf,
  warningsOf,
  startLabel,
  onSelect,
  onOpen,
}: TreeCanvasProps) {
  // React Flow setzt sonst die Klasse „light“ an seinen Container und damit die hellen Tokens
  const { theme } = useSettings().settings;
  const { flowNodes, flowEdges } = useMemo(() => {
    const ordered = [...nodes].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    const positions = layoutTree([
      { id: START_ID, parentId: null },
      ...ordered.map((n) => ({ id: n.id, parentId: n.parentId ?? START_ID })),
    ]);
    const onPath = (id: string) => id === START_ID || path.has(id);

    const flowNodes: TreeNode[] = [
      {
        id: START_ID,
        type: 'step',
        position: positions.get(START_ID)!,
        data: {
          label: startLabel,
          detail: '',
          image: null,
          opponent: false,
          warnings: 0,
          selected: selectedId === START_ID,
          onPath: true,
          start: true,
        },
      },
      ...ordered.map((n): TreeNode => ({
        id: n.id,
        type: 'step',
        position: positions.get(n.id)!,
        data: {
          label: labelOf(n),
          detail: detailOf(n),
          image: imageOf(n),
          opponent: n.player === 'opponent' || n.kind === 'OPPONENT',
          warnings: warningsOf(n.id),
          selected: n.id === selectedId,
          onPath: onPath(n.id),
          start: false,
        },
      })),
    ];

    const mainChild = new Set(
      [null, ...nodes.map((n) => n.id)].map((id) => childrenOf(nodes, id)[0]?.id).filter(Boolean)
    );
    const flowEdges: Edge[] = nodes.map((n) => {
      const opponent = n.player === 'opponent' || n.kind === 'OPPONENT';
      const main = mainChild.has(n.id);
      return {
        id: `${n.parentId ?? START_ID}->${n.id}`,
        source: n.parentId ?? START_ID,
        target: n.id,
        type: 'smoothstep',
        label: main ? undefined : (n.edgeLabel ?? undefined),
        labelStyle: {
          fill: opponent ? 'var(--opponent)' : 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
        },
        labelBgStyle: { fill: 'var(--bg)' },
        style: {
          stroke: opponent ? 'var(--opponent)' : main ? 'var(--text-muted)' : 'var(--line-strong)',
          strokeWidth: main ? 2 : 1.5,
          opacity: onPath(n.id) ? 1 : 0.6,
        },
      };
    });
    return { flowNodes, flowEdges };
  }, [nodes, selectedId, path, labelOf, detailOf, imageOf, warningsOf, startLabel]);

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      onNodeClick={(_, node) => onSelect(node.id)}
      onNodeDoubleClick={(_, node) => onOpen(node.id)}
      fitView
      fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
      minZoom={0.2}
      colorMode={theme}
      proOptions={{ hideAttribution: true }}
      className="bg-bg"
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--line)" />
      <Controls showInteractive={false} position="bottom-right" />
      <MiniMap
        pannable
        zoomable
        position="bottom-left"
        bgColor="var(--surface-1)"
        maskColor="rgb(0 0 0 / 0.35)"
        nodeColor={(n) =>
          (n.data as TreeNodeData).opponent ? 'var(--opponent)' : 'var(--line-strong)'
        }
      />
    </ReactFlow>
  );
}

function TreeNodeView({ data }: NodeProps<TreeNode>) {
  return (
    <div
      style={{ width: TREE_NODE_WIDTH }}
      className={cn(
        'flex h-14 items-center gap-2.5 rounded-lg border bg-surface-2 px-3 text-left transition-opacity duration-(--motion-base)',
        data.opponent ? 'border-opponent shadow-[inset_3px_0_0_var(--opponent)]' : 'border-line',
        data.start && 'border-dashed',
        data.selected && 'outline-[1.5px] outline-offset-2 outline-primary outline',
        !data.onPath && 'opacity-60'
      )}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      {data.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- lokaler Bild-Cache
        <img
          src={data.image}
          alt=""
          className="size-8 shrink-0 scale-100 rounded-sm object-cover object-[50%_30%]"
        />
      ) : (
        <span className="size-8 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-[12.5px] font-medium',
            data.opponent ? 'text-opponent' : 'text-ink'
          )}
        >
          {data.label}
        </div>
        {data.detail && <div className="truncate text-[11.5px] text-text-muted">{data.detail}</div>}
      </div>
      {data.warnings > 0 && <TriangleAlert className="size-3.5 shrink-0 text-warning" />}
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}
