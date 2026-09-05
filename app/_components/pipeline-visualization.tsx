"use client";
import { useCallback, useState } from "react";
import { ReactNode } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Link,
  FileCode2,
  BrainCircuit,
  Database,
  PenLine,
  Save,
  ShieldCheck,
  FileDown,
  BarChart3,
} from "lucide-react";
import { Accent } from "@/types/types";
import { EDGE_COLORS } from "@/constants/constants";

const ACCENTS: Record<Accent, { icon: string; handle: string; hover: string }> = {
  blue: {
    icon: "text-blue-400",
    handle: "!bg-blue-500",
    hover: "hover:border-blue-500/40",
  },
  emerald: {
    icon: "text-emerald-400",
    handle: "!bg-emerald-500",
    hover: "hover:border-emerald-500/40",
  },
  purple: {
    icon: "text-purple-400",
    handle: "!bg-purple-500",
    hover: "hover:border-purple-500/40",
  },
};

interface WorkflowNodeData {
  title: string;
  description: string;
  icon: ReactNode;
  accent: Accent;
  step?: string;
}

// Cards styled to match the rest of the site rather than default flow boxes.
const WorkflowNode = ({ data }: { data: WorkflowNodeData }) => {
  const a = ACCENTS[data.accent];
  return (
    <div
      className={`group relative w-[280px] rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-2xl transition-colors ${a.hover}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={`-ml-1 h-3 w-3 !border-2 !border-zinc-900 opacity-0 transition-opacity group-hover:opacity-100 ${a.handle}`}
      />

      <div className="mb-3 flex items-center gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/5 bg-black ${a.icon}`}
        >
          {data.icon}
        </div>
        <div className="min-w-0">
          {data.step && (
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              {data.step}
            </span>
          )}
          <h3 className="font-oswald text-md font-bold tracking-wide text-white">
            {data.title}
          </h3>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-zinc-400">{data.description}</p>

      <Handle
        type="source"
        position={Position.Right}
        className={`-mr-1 h-3 w-3 !border-2 !border-zinc-900 opacity-0 transition-opacity group-hover:opacity-100 ${a.handle}`}
      />
    </div>
  );
};

const nodeTypes = {
  saasNode: WorkflowNode,
};

const LANE_A = 0; // AI extraction
const LANE_B = 280; // editor & vault
const COL = 350;

const initialNodes: Node[] = [
 // ai and extration
  {
    id: "a1",
    type: "saasNode",
    position: { x: 0, y: LANE_A },
    data: {
      step: "Step 1",
      title: "Paste a URL",
      description:
        "Drop in any article link, optionally with a category and keyword to steer the analysis.",
      icon: <Link size={18} />,
      accent: "blue",
    },
  },
  {
    id: "a2",
    type: "saasNode",
    position: { x: COL, y: LANE_A },
    data: {
      step: "Step 2",
      title: "Scrape & Clean",
      description:
        "We fetch the page and strip scripts, navigation, headers, footers and iframes — leaving only the article.",
      icon: <FileCode2 size={18} />,
      accent: "blue",
    },
  },
  {
    id: "a3",
    type: "saasNode",
    position: { x: COL * 2, y: LANE_A },
    data: {
      step: "Step 3",
      title: "Gemini Analysis",
      description:
        "The clean text goes to Gemini, which returns a bulleted summary, tags and extra context.",
      icon: <BrainCircuit size={18} />,
      accent: "blue",
    },
  },
  {
    id: "a4",
    type: "saasNode",
    position: { x: COL * 3, y: LANE_A },
    data: {
      step: "Step 4",
      title: "Saved to Library",
      description:
        "Title, cover image, summary and tags are filed into your links library, ready to search.",
      icon: <Database size={18} />,
      accent: "blue",
    },
  },

  // editoir and encrypt lanes
  {
    id: "b1",
    type: "saasNode",
    position: { x: 0, y: LANE_B },
    data: {
      step: "Step 1",
      title: "Write in Markdown",
      description:
        "Draft notes in the live editor with side-by-side preview and multiple document tabs.",
      icon: <PenLine size={18} />,
      accent: "emerald",
    },
  },
  {
    id: "b2",
    type: "saasNode",
    position: { x: COL, y: LANE_B },
    data: {
      step: "Step 2",
      title: "Auto-save",
      description:
        "Edits are debounced and persisted as you type — there is no save button to forget.",
      icon: <Save size={18} />,
      accent: "emerald",
    },
  },
  {
    id: "b3",
    type: "saasNode",
    position: { x: COL * 2, y: LANE_B },
    data: {
      step: "Optional",
      title: "Encrypt in Browser",
      description:
        "Turn on the vault: Argon2id derives a key from your passphrase and seals the note with XSalsa20-Poly1305.",
      icon: <ShieldCheck size={18} />,
      accent: "emerald",
    },
  },
  {
    id: "b4",
    type: "saasNode",
    position: { x: COL * 3, y: LANE_B },
    data: {
      step: "Step 3",
      title: "Stored & Exportable",
      description:
        "Only ciphertext reaches our servers. Export any document to PDF straight from the browser.",
      icon: <FileDown size={18} />,
      accent: "emerald",
    },
  },

  // meeting point of both lanes ie analytics
  {
    id: "c1",
    type: "saasNode",
    position: { x: COL * 4, y: (LANE_A + LANE_B) / 2 },
    data: {
      step: "Insights",
      title: "Analytics Dashboard",
      description:
        "Activity from your library and your documents rolls up into trends, top tags and plan usage.",
      icon: <BarChart3 size={18} />,
      accent: "purple",
    },
  },
];

const flow = (id: string, source: string, target: string, accent: Accent): Edge => ({
  id,
  source,
  target,
  animated: true,
  style: { stroke: EDGE_COLORS[accent] },
});

const initialEdges: Edge[] = [
  flow("a1-a2", "a1", "a2", "blue"),
  flow("a2-a3", "a2", "a3", "blue"),
  flow("a3-a4", "a3", "a4", "blue"),

  flow("b1-b2", "b1", "b2", "emerald"),
  flow("b2-b3", "b2", "b3", "emerald"),
  flow("b3-b4", "b3", "b4", "emerald"),

  // both pipelines feed analytics
  flow("a4-c1", "a4", "c1", "purple"),
  flow("b4-c1", "b4", "c1", "purple"),
];

export default function PipelineVisualization() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  // allow nodes to be dragged, but deletion
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const safeChanges = changes.filter((c) => c.type !== "remove");
    setEdges((eds) => applyEdgeChanges(safeChanges, eds));
  }, []);

  return (
    <div className="relative h-[640px] w-full overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm">
      {/* nodesConnectable={false} prevents users from drawing new lines.
        edgesFocusable={false} prevents users from clicking and interacting with the lines.
      */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesConnectable={false}
        elementsSelectable={false}
        edgesFocusable={false}
        fitView
        className="touch-none"
        colorMode="dark"
      >
        <Background gap={24} size={2} color="#27272a" />
        <Controls
          className="border-zinc-800 bg-zinc-900 fill-white"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
