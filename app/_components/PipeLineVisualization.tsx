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
import { Link, FileCode2, BrainCircuit, Database, Webhook } from "lucide-react";

interface WorkflowNodeData {
  title: string;
  description: string;
  icon: ReactNode;
}

// This ensures the nodes look like high-end SaaS cards instead of boring default boxes.
const WorkflowNode = ({ data }: { data: WorkflowNodeData }) => {
  return (
    <div className="relative p-4 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl w-[280px] hover:border-white/30 transition-colors group">
      {/* Target Handle (Input) - Moved to Left */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 !bg-blue-500 !border-2 !border-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity -ml-1" 
      />
      
      <div className="flex items-center gap-4 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/5 bg-black text-blue-500">
          {data.icon}
        </div>
        <h3 className="text-md font-bold text-white font-oswald tracking-wide">
          {data.title}
        </h3>
      </div>
      
      <p className="text-sm text-zinc-400 leading-relaxed">
        {data.description}
      </p>

      {/* Source Handle (Output) - Moved to Right */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 !bg-blue-500 !border-2 !border-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity -mr-1" 
      />
    </div>
  );
};

// Register the custom node type
const nodeTypes = {
  saasNode: WorkflowNode,
};

// --- 2. INITIAL DATA ---
const initialNodes: Node[] = [
  {
    id: "1",
    type: "saasNode",
    position: { x: 50, y: 200 },
    data: {
      title: "Input Source",
      description: "User pastes a target URL into the system.",
      icon: <Link size={18} />,
    },
  },
  {
    id: "2",
    type: "saasNode",
    position: { x: 400, y: 200 },
    data: {
      title: "Intelligent Scraper",
      description: "Fetches raw HTML, stripping ads and noise.",
      icon: <FileCode2 size={18} />,
    },
  },
  {
    id: "3",
    type: "saasNode",
    position: { x: 750, y: 200 },
    data: {
      title: "Gemini AI Core",
      description: "Analyzes text, generates tags, and creates embeddings.",
      icon: <BrainCircuit size={18} />,
    },
  },
  {
    id: "4a",
    type: "saasNode",
    position: { x: 1100, y: 100 }, // Branches up
    data: {
      title: "Vector Database",
      description: "Indexes the insights for instant semantic retrieval.",
      icon: <Database size={18} />,
    },
  },
  {
    id: "4b",
    type: "saasNode",
    position: { x: 1100, y: 300 }, // Branches down
    data: {
      title: "Webhook Trigger",
      description: "Fires parsed JSON data directly to your application.",
      icon: <Webhook size={18} />,
    },
  },
];

// Setting animated to true creates a flowing data effect along the paths
const initialEdges = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
  {
    id: "e2-3",
    source: "2",
    target: "3",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
  {
    id: "e3-4a",
    source: "3",
    target: "4a",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
  {
    id: "e3-4b",
    source: "3",
    target: "4b",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
];

// --- 3. MAIN COMPONENT ---
export default function PipelineVisualization() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  // Allow nodes to be dragged, but prevent users from deleting nodes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  // Type 'changes' as an array of EdgeChange objects
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const safeChanges = changes.filter((c) => c.type !== "remove");
    setEdges((eds) => applyEdgeChanges(safeChanges, eds));
  }, []);

  return (
    <div className="w-full h-[600px] border border-white/10  overflow-hidden bg-black/40 relative backdrop-blur-sm">
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
        // Dark mode specific styling for the canvas
        colorMode="dark"
      >
        <Background gap={24} size={2} color="#27272a" />
        <Controls
          className="bg-zinc-900 fill-white border-zinc-800"
          showInteractive={false}
        />
        {/* <MiniMap
          nodeColor="#3b82f6"
          maskColor="rgba(0, 0, 0, 0.7)"
          className="bg-zinc-900 border-zinc-800 rounded-xl"
        /> */}
      </ReactFlow>
    </div>
  );
}
