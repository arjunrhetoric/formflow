'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactFlow, {
  Controls, Background, useNodesState, useEdgesState, addEdge,
  Handle, Position, MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getForm, updateForm } from '@/lib/api/forms';
import { Button } from '@/components/ui/Button';
import { AuthGuard } from '@/components/AuthGuard';
import { LogicEdgeModal } from '@/components/LogicEdgeModal';
import { useCollaborativeArea } from '@/hooks/useCollaborativeArea';
import { RemoteCursors } from '@/components/RemoteCursors';
import { PresenceAvatars } from '@/components/PresenceAvatars';
import { ChevronLeft, Save, Loader2, Zap, Info } from 'lucide-react';

const CustomNode = ({ data }: any) => {
  const hasLogic = (data.logicCount || 0) > 0;
  return (
    <div className={`bg-card rounded-xl border-2 p-4 min-w-[220px] shadow-sm relative transition-colors ${hasLogic ? 'border-primary/40' : 'border-border'}`}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-background !border-2 !border-primary !-ml-1.5" />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {data.type?.replace('_', ' ')}
        </div>
        {hasLogic && (
          <div className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Zap className="h-2.5 w-2.5" /> {data.logicCount}
          </div>
        )}
      </div>
      <div className="text-sm font-semibold text-foreground">{data.label}</div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-primary !border-none !-mr-1.5" />
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { canvasRef, remoteCursors, presenceList, socketId } = useCollaborativeArea(id);

  // Edge modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEdge, setEditingEdge] = useState<any>(null);
  const [pendingConnection, setPendingConnection] = useState<any>(null);

  useEffect(() => {
    getForm(id).then((r) => {
      const nextForm = r.data.form;
      setForm(nextForm);
      const fields = nextForm.fields || [];

      // Position nodes in a grid layout
      const cols = 3;
      setNodes(fields.map((field: any, index: number) => ({
        id: field.id,
        type: 'custom',
        position: {
          x: 80 + (index % cols) * 300,
          y: 80 + Math.floor(index / cols) * 150,
        },
        data: {
          label: field.label,
          type: field.type,
          logicCount: (field.logic || []).length,
        },
      })));

      // Build edges from existing logic rules
      let edgeId = 0;
      const allEdges: any[] = [];
      fields.forEach((field: any) => {
        (field.logic || []).forEach((rule: any, ruleIndex: number) => {
          const sourceId = rule.condition.field === 'self' ? field.id : rule.condition.field;
          const targets = rule.action.targets || [];
          targets.forEach((targetId: string) => {
            allEdges.push({
              id: `edge-${edgeId++}`,
              source: sourceId,
              target: targetId,
              animated: true,
              label: `${rule.condition.op} "${rule.condition.value || ''}" → ${rule.action.type}`,
              labelStyle: { fontSize: 10, fontWeight: 600 },
              style: { stroke: '#18181b', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
              data: { rule, sourceFieldId: field.id, ruleIndex },
            });
          });
        });
      });
      setEdges(allEdges);
    });
  }, [id, setEdges, setNodes]);

  // When user connects two nodes -> open modal to configure the rule
  const onConnect = useCallback((params: any) => {
    setPendingConnection(params);
    setEditingEdge(null);
    setModalOpen(true);
  }, []);

  // When user clicks an existing edge -> open modal to edit
  const onEdgeClick = useCallback((_event: any, edge: any) => {
    setEditingEdge(edge);
    setPendingConnection(null);
    setModalOpen(true);
  }, []);

  const handleModalSave = (rule: any) => {
    if (pendingConnection) {
      // New edge
      const newEdge = {
        ...pendingConnection,
        id: `edge-${Date.now()}`,
        animated: true,
        label: `${rule.condition.op} "${rule.condition.value || ''}" → ${rule.action.type}`,
        labelStyle: { fontSize: 10, fontWeight: 600 },
        style: { stroke: '#18181b', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        data: { rule, sourceFieldId: pendingConnection.source },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    } else if (editingEdge) {
      // Update existing edge
      setEdges((eds) =>
        eds.map((e) =>
          e.id === editingEdge.id
            ? {
                ...e,
                label: `${rule.condition.op} "${rule.condition.value || ''}" → ${rule.action.type}`,
                data: { ...e.data, rule },
              }
            : e
        )
      );
    }
    setPendingConnection(null);
    setEditingEdge(null);
  };

  const handleModalDelete = () => {
    if (editingEdge) {
      setEdges((eds) => eds.filter((e) => e.id !== editingEdge.id));
    }
    setEditingEdge(null);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);

    // Build logic arrays from edges
    const logicMap = new Map<string, any[]>();
    edges.forEach((edge: any) => {
      const sourceId = edge.source;
      const targetId = edge.target;
      const rule = edge.data?.rule || {
        condition: { field: 'self', op: 'equals', value: '' },
        action: { type: 'hide', targets: [targetId] },
      };
      const rules = logicMap.get(sourceId) || [];
      // Ensure target is in the rule
      const finalRule = {
        ...rule,
        action: {
          ...rule.action,
          targets: [...new Set([...(rule.action.targets || []), targetId])],
        },
      };
      rules.push(finalRule);
      logicMap.set(sourceId, rules);
    });

    const updatedFields = (form.fields || []).map((field: any) => ({
      ...field,
      logic: logicMap.get(field.id) || [],
    }));

    const response = await updateForm(id, { fields: updatedFields });
    setForm(response.data.form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sourceField = pendingConnection
    ? form?.fields?.find((f: any) => f.id === pendingConnection.source)
    : editingEdge
    ? form?.fields?.find((f: any) => f.id === editingEdge.source)
    : null;

  const targetFieldsForModal = pendingConnection
    ? [form?.fields?.find((f: any) => f.id === pendingConnection.target)].filter(Boolean)
    : editingEdge
    ? [form?.fields?.find((f: any) => f.id === editingEdge.target)].filter(Boolean)
    : [];

  if (!form) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div ref={canvasRef} className="flex flex-col h-screen bg-[#f4f4f5] relative">
        <RemoteCursors cursors={remoteCursors} currentSocketId={socketId} />
        {/* Toolbar */}
        <div className="flex h-14 items-center px-4 border-b border-border bg-card shrink-0 gap-4 shadow-sm z-10 relative">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/builder/${id}`)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-bold text-lg">{form.title}</span>

          <div className="toolbar-nav mx-auto">
            <button className="toolbar-nav-item" onClick={() => router.push(`/builder/${id}`)}>Workshop</button>
            <button className="toolbar-nav-item active">Logic</button>
            <button className="toolbar-nav-item" onClick={() => router.push(`/theme/${id}`)}>Theme</button>
            <button className="toolbar-nav-item" onClick={() => router.push(`/history/${id}`)}>History</button>
            <button className="toolbar-nav-item" onClick={() => router.push(`/vault/${id}`)}>Vault</button>
          </div>

          <div className="mr-2">
            <PresenceAvatars users={presenceList} />
          </div>
          <Button className="h-8 text-xs" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : saved ? '✓ Saved' : <><Save className="mr-2 h-3 w-3" /> Save Logic</>}
          </Button>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 w-full h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
          >
            <Background color="#e4e4e7" gap={24} size={2} />
            <Controls className="fill-foreground text-foreground border-border" />
          </ReactFlow>

          {/* Instructions panel */}
          <div className="absolute top-4 right-4 w-72 bg-card border border-border rounded-xl shadow-lg p-4 z-10">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm">Logic Rules</h3>
            </div>
            <div className="text-xs text-muted-foreground space-y-2">
              <p><strong>Connect</strong> two fields by dragging from the right handle of a source field to the left handle of a target field.</p>
              <p><strong>Click an edge</strong> to edit its condition and action.</p>
              <p>Conditions: equals, not equals, contains, greater/less than.</p>
              <p>Actions: <strong>hide</strong>, <strong>show</strong>, or <strong>jump</strong> to fields.</p>
            </div>
          </div>
        </div>

        {/* Edge config modal */}
        <LogicEdgeModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setPendingConnection(null); setEditingEdge(null); }}
          onSave={handleModalSave}
          onDelete={editingEdge ? handleModalDelete : undefined}
          sourceField={sourceField}
          targetFields={targetFieldsForModal}
          allFields={(form.fields || []).map((f: any) => ({ id: f.id, label: f.label }))}
          initialRule={editingEdge?.data?.rule}
        />
      </div>
    </AuthGuard>
  );
}
