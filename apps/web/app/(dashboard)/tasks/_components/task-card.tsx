"use client";

import { CalendarDays, Trash2, User } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { TaskRow } from "@/types/task";
import { PriorityBadge } from "./priority-badge";

export interface TaskCardProps {
  task: TaskRow;
  onClick: () => void;
  onDragStart: () => void;
  onDelete: () => void;
  dragging?: boolean;
}

export function TaskCard({ task, onClick, onDragStart, onDelete, dragging }: TaskCardProps) {
  const overdue =
    task.dueDate && task.status !== "done" && new Date(task.dueDate).getTime() < Date.now();

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onClick={onClick}
      className={`group cursor-grab space-y-2 rounded-md border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:shadow ${
        dragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="line-clamp-2 text-sm font-medium">{task.title}</div>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.client && (
        <div className="text-xs text-muted-foreground">{task.client.name}</div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {task.assignee && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.assignee.name}
            </span>
          )}
          {task.dueDate && (
            <span className={`flex items-center gap-1 ${overdue ? "text-red-600" : ""}`}>
              <CalendarDays className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="tap-target inline-flex items-center justify-center rounded p-1 opacity-0 transition group-hover:opacity-100 hover:bg-muted [@media(pointer:coarse)]:opacity-100"
          aria-label="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
