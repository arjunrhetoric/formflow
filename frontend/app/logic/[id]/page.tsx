'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactFlow, { MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { getForm, updateForm } from '@/lib/api/forms';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, Save } from 'lucide-react';

const CustomNode = ({ data }: any) => {
  return (
    <div className="bg-card rounded-xl border border-border p-4 min-w-[200px] shadow-sm relative">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-background border-2 border-primary -ml-1.5" />
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full inline-block mb-2">
        {data.type}
      </div>
      <div className="text-sm font-semibold text-foreground">{data.label}</div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-primary border-none -mr-1.5" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export default function LogicMap() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    getForm(id).then(r => {
      setForm(r.data);
      const fs = r.data.fields || [];
      const initNodes = fs.map((f: any, i: number) => ({
        id: f.id,
        type: 'custom',
        position: { x: 100 + (i * 280), y: 150 },
        data: { label: f.label, type: f.type }
      }));
      setNodes(initNodes);
    });
  }, [id]);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#18181b', strokeWidth: 2 } }, eds)), [setEdges]);

  if (!form) return null;

  return (
    <div className="flex flex-col h-screen bg-[#f4f4f5]">
      {/* TopBar */}
      <div className="flex h-14 items-center px-4 border-b border-border bg-card shrink-0 gap-4 shadow-sm z-10 relative">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/builder/${id}`)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-bold text-lg">{form.title}</span>
        
        <div className="flex items-center mx-auto bg-muted/50 p-1 rounded-md border border-border">
          <Button variant="ghost" className="h-8 px-4 text-muted-foreground" onClick={() => router.push(`/builder/${id}`)}>Workshop</Button>
          <Button variant="ghost" className="h-8 bg-background shadow-sm px-4">Logic</Button>
          <Button variant="ghost" className="h-8 px-4 text-muted-foreground" onClick={() => router.push(`/theme/${id}`)}>Theme</Button>
        </div>

        <Button className="h-8"><Save className="mr-2 h-4 w-4" /> Save Logic</Button>
      </div>
      
      <div className="flex-1 w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#e4e4e7" gap={24} size={2} />
          <Controls className="fill-foreground text-foreground border-border" />
        </ReactFlow>
      </div>

      <div className="absolute top-20 right-8 w-80 bg-card border border-border rounded-xl shadow-lg p-5 z-10 flex flex-col gap-4">
        <h3 className="font-bold">Logic Rules</h3>
        <p className="text-sm text-muted-foreground">Drag between nodes to create conditional flow edges.</p>
      </div>
    </div>
  );
}
