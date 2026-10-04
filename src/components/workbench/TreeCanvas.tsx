'use client';

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
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
  useStore,
  useStoreApi,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TriangleAlert } from 'lucide-react';
import { animate, motion, useMotionValue } from 'motion/react';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion';
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
  /** Tiefe im Baum: Knoten und Kanten erscheinen danach gestaffelt (Szene „Moduswechsel“) */
  depth: number;
}

type TreeNode = Node<TreeNodeData, 'step'>;

/** Bildschirmlage der Zeilen in der Line-Liste vor dem Wechsel, je Knoten-ID */
const FlightFrom = createContext<Map<string, DOMRect>>(new Map());
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
  /** Zeilen der Line-Liste, aus denen die Knoten beim Wechsel ins Bild fliegen */
  flightFrom?: Map<string, DOMRect>;
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
  flightFrom,
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
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const depthOf = (id: string) => {
      let d = 1;
      for (let n = byId.get(id); n?.parentId; n = byId.get(n.parentId)) d++;
      return d;
    };

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
          depth: 0,
        },
      },
      ...ordered.map((n): TreeNode => ({
        id: n.id,
        type: 'step',
        position: positions.get(n.id)!,
        data: {
          label: labelOf(n),
          // Gleicher Untertitel wie Titel („Endboard / Endboard“) bringt nichts
          detail: detailOf(n) === labelOf(n) ? '' : detailOf(n),
          image: imageOf(n),
          opponent: n.player === 'opponent' || n.kind === 'OPPONENT',
          warnings: warningsOf(n.id),
          selected: n.id === selectedId,
          onPath: onPath(n.id),
          start: false,
          depth: depthOf(n.id),
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
        className: 'edge-draw',
        label: main ? undefined : (n.edgeLabel ?? undefined),
        labelStyle: {
          fill: opponent ? 'var(--opponent)' : 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
        },
        labelBgStyle: { fill: 'var(--bg)' },
        style: {
          stroke: opponent ? 'var(--opponent)' : main ? 'var(--text-muted)' : 'var(--line-strong)',
          strokeWidth: main ? 2 : 1.5,
          opacity: onPath(n.id) ? 1 : 0.75,
          animationDelay: `${80 + stagger(depthOf(n.id)) * 45}ms`,
        },
      };
    });
    return { flowNodes, flowEdges };
  }, [nodes, selectedId, path, labelOf, detailOf, imageOf, warningsOf, startLabel]);

  return (
    <FlightFrom.Provider value={flightFrom ?? EMPTY}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, node) => onSelect(node.id)}
        onNodeDoubleClick={(_, node) => onOpen(node.id)}
        fitView
        // Nicht kleiner als 0,7, damit die Knotentexte lesbar bleiben (UI-Sweep-Plan 3.10)
        fitViewOptions={{ maxZoom: 1, minZoom: 0.7, padding: 0.2 }}
        minZoom={0.2}
        colorMode={theme}
        proOptions={{ hideAttribution: true }}
        className="bg-bg"
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--line)" />
        <Controls showInteractive={false} position="bottom-right" />
        {nodes.length >= 10 && (
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            bgColor="var(--surface-1)"
            maskColor="rgb(0 0 0 / 0.35)"
            nodeColor={(n) =>
              (n.data as TreeNodeData).opponent ? 'var(--opponent)' : 'var(--line-strong)'
            }
            className="!rounded-md !border !border-line"
          />
        )}
      </ReactFlow>
    </FlightFrom.Provider>
  );
}

const EMPTY = new Map<string, DOMRect>();

/**
 * Knoten und Kanten erscheinen nach Tiefe gestaffelt, aber nur über die ersten Ebenen: Bei einem
 * tiefen Baum wartete man sonst über eine halbe Sekunde auf die untersten (Motion-Prinzip 5).
 */
const stagger = (depth: number) => Math.min(depth, 6);

/**
 * Szene „Moduswechsel“: Ein Knoten, dessen Schritt eben noch in der Line-Liste stand, fliegt von
 * dort an seinen Platz im Baum. So sieht man, dass es dieselben Schritte sind. Gemessen wird erst,
 * wenn React Flow die Knoten vermessen und eingepasst hat; vorher stimmt ihre Lage nicht.
 */
function useFlight(id: string) {
  const from = useContext(FlightFrom).get(id);
  const ref = useRef<HTMLDivElement>(null);
  // Eigene Werte für den Versatz: motion.div setzt sein Transform bei jedem Rendern neu
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Erst nach dem Einpassen (fitView) stimmt die Lage. nodesInitialized taugt dafür nicht:
  // es blieb hier dauerhaft false, fitViewQueued fällt dagegen nach dem Einpassen
  const ready = useStore((st) => !st.fitViewQueued);
  const store = useStoreApi();
  useEffect(() => {
    const el = ref.current;
    if (!from || !ready || !el) return;
    const frame = requestAnimationFrame(() => {
      const to = el.getBoundingClientRect();
      // Der Knoten liegt im skalierten Viewport: Bildschirm-Pixel durch Zoom
      const zoom = store.getState().transform[2];
      animate(x, [(from.left + from.width / 2 - (to.left + to.width / 2)) / zoom, 0], SPRING.soft);
      animate(y, [(from.top + from.height / 2 - (to.top + to.height / 2)) / zoom, 0], SPRING.soft);
    });
    return () => cancelAnimationFrame(frame);
  }, [from, ready, store, x, y]);
  return { ref, x, y, flies: Boolean(from) };
}

function TreeNodeView({ id, data }: NodeProps<TreeNode>) {
  const opacity = data.onPath ? 1 : 0.8;
  const { ref, x, y, flies } = useFlight(id);
  return (
    <motion.div
      ref={ref}
      // Fliegende Knoten bewegt useFlight über x und y; die übrigen wachsen wie bisher nach Tiefe
      initial={flies ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity, scale: 1 }}
      transition={{
        type: 'spring',
        bounce: 0.18,
        visualDuration: 0.25,
        delay: 0.05 + stagger(data.depth) * 0.03,
      }}
      style={{ width: TREE_NODE_WIDTH, x, y }}
      className={cn(
        'flex h-14 items-center gap-2.5 rounded-lg border bg-surface-2 px-3 text-left transition-opacity duration-(--motion-base)',
        data.opponent ? 'border-opponent shadow-[inset_3px_0_0_var(--opponent)]' : 'border-line',
        data.start && 'border-dashed',
        data.selected && 'outline-[1.5px] outline-offset-2 outline-primary outline'
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
            'truncate text-[13px] font-medium',
            data.opponent ? 'text-opponent' : 'text-ink'
          )}
        >
          {data.label}
        </div>
        {data.detail && <div className="truncate text-xs text-text-muted">{data.detail}</div>}
      </div>
      {data.warnings > 0 && <TriangleAlert className="size-3.5 shrink-0 text-warning" />}
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </motion.div>
  );
}
