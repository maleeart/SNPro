"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { updateProjectStatus, type ProjectStatus } from "@/app/(dashboard)/projects/actions";

export type Project = {
  id: string;
  name: string;
  contract_no: string | null;
  status: ProjectStatus;
};

const COLUMNS: { key: ProjectStatus; label: string }[] = [
  { key: "future",      label: "Future Pipeline" },
  { key: "in_progress", label: "In-Progress" },
  { key: "completed",   label: "Completed" },
];

function Card({ p, draggable }: { p: Project; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: p.id, disabled: !draggable });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border bg-card p-3 shadow-sm ${isDragging ? "opacity-40" : ""}`}
      {...(draggable ? { ...listeners, ...attributes } : {})}
    >
      {/* link separate from drag handle area so click still navigates */}
      <Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
      {p.contract_no && <div className="text-xs text-muted-foreground mt-1">{p.contract_no}</div>}
    </div>
  );
}

function Column({ col, projects, draggable }: {
  col: { key: ProjectStatus; label: string };
  projects: Project[];
  draggable: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div ref={setNodeRef}
      className={`flex-1 min-w-0 rounded-xl border bg-muted/30 p-3 ${isOver ? "ring-2 ring-primary" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-sm">{col.label}</h2>
        <Badge variant="secondary">{projects.length}</Badge>
      </div>
      <div className="space-y-2">
        {projects.map((p) => <Card key={p.id} p={p} draggable={draggable} />)}
      </div>
    </div>
  );
}

export function KanbanBoard({ initial, canMove }: { initial: Project[]; canMove: boolean }) {
  const [projects, setProjects] = useState(initial);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(e: DragEndEvent) {
    const status = e.over?.id as ProjectStatus | undefined;
    const id = e.active.id as string;
    if (!status) return;
    const target = projects.find((p) => p.id === id);
    if (!target || target.status === status) return;
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, status } : p))); // optimistic
    updateProjectStatus(id, status).catch(() => setProjects(initial)); // rollback on failure
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex gap-4 items-start">
        {COLUMNS.map((col) => (
          <Column key={col.key} col={col} draggable={canMove}
            projects={projects.filter((p) => p.status === col.key)} />
        ))}
      </div>
    </DndContext>
  );
}
