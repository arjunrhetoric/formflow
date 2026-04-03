'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactFlow, { Controls, Background, useNodesState, useEdgesState, addEdge, Handle, Position } from 'reactflow';
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
    getForm(id).then((r) => {
      const nextForm = r.data.form;
      setForm(nextForm);
      const fields = nextForm.fields || [];
      setNodes(fields.map((field: any, index: number) => ({
        id: field.id,
        type: 'custom',
        position: { x: 100 + (index * 280), y: 150 },
        data: { label: field.label, type: field.type },
      })));
      setEdges(
        fields.flatMap((field: any) =>
          (field.logic || []).map((rule: any, index: number) => ({
            id: `${field.id}-${index}`,
            source: rule.condition.field === 'self' ? field.id : rule.condition.field,
            target: rule.action.targets?.[0] || rule.action.destination,
            animated: true,
            style: { stroke: '#18181b', strokeWidth: 2 },
          }))
        ).filter((edge: any) => edge.source && edge.target)
      );
    });
  }, [id, setEdges, setNodes]);

  const onConnect = useCallback((params: any) => {
    setEdges((currentEdges) => addEdge({ ...params, animated: true, style: { stroke: '#18181b', strokeWidth: 2 } }, currentEdges));
  }, [setEdges]);

  const handleSave = async () => {
    if (!form) {
      return;
    }

    const logicMap = new Map<string, any[]>();
    edges.forEach((edge: any) => {
      const rules = logicMap.get(edge.source) || [];
      rules.push({
        condition: { field: 'self', op: 'equals', value: 'Yes' },
        action: { type: 'hide', targets: [edge.target] },
      });
      logicMap.set(edge.source, rules);
    });

    const updatedFields = (form.fields || []).map((field: any) => ({
      ...field,
      logic: logicMap.get(field.id) || [],
    }));

    const response = await updateForm(id, { fields: updatedFields });
    setForm(response.data.form);
  };

  if (!form) return null;

  return (
    <div className="flex flex-col h-screen bg-[#f4f4f5]">
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

        <Button className="h-8" onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save Logic</Button>
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
        <p className="text-sm text-muted-foreground">Connect one field to another to create a simple hide rule. This page currently saves visual links as `hide` logic rules.</p>
      </div>
    </div>
  );
}
