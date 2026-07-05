"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { TASK_STATUS, type TaskStatus } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "@/hooks/use-tasks";
import { isOffline } from "@/lib/offline";
import type { TaskRow } from "@/types/task";
import { TaskCard } from "./_components/task-card";
import { TaskForm } from "./_components/task-form";

const COLUMNS: Array<{ status: TaskStatus; title: string }> = [
  { status: "todo", title: "To Do" },
  { status: "progress", title: "In Progress" },
  { status: "review", title: "Review" },
  { status: "done", title: "Done" },
];

export default function TasksPage() {
  const { data, isLoading, isError, error, refetch } = useTasks();
  const create = useCreateTask();
  const update = useUpdateTask();
  const del = useDeleteTask();

  const [dialogMode, setDialogMode] = useState<
    | { kind: "closed" }
    | { kind: "create"; status?: TaskStatus }
    | { kind: "edit"; task: TaskRow }
  >({ kind: "closed" });

  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<TaskStatus | null>(null);

  const columns = useMemo(() => {
    const map: Record<TaskStatus, TaskRow[]> = { todo: [], progress: [], review: [], done: [] };
    for (const t of data ?? []) map[t.status].push(t);
    return map;
  }, [data]);

  function handleDrop(status: TaskStatus) {
    if (!dragId) return;
    const task = data?.find((t) => t.id === dragId);
    setDragId(null);
    setHoverCol(null);
    if (!task || task.status === status) return;
    // Optimistic (see useUpdateTask); don't await so an offline/paused write
    // can't leave a dangling rejection, and surface real errors.
    update.mutateAsync({ id: task.id, input: { status } }).catch((err) => {
      if (!isOffline()) alert(err instanceof Error ? err.message : "Failed to move task");
    });
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete task "${title}"?`)) return;
    try {
      await del.mutateAsync(id);
    } catch (err) {
      if (!isOffline()) alert(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.length} task${data.length === 1 ? "" : "s"}` : " "} · Drag to change status
          </p>
        </div>
        <Button onClick={() => setDialogMode({ kind: "create" })} className="w-full md:w-auto">
          <Plus className="h-4 w-4" />
          New task
        </Button>
      </header>

      {isError && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load tasks: {error instanceof Error ? error.message : "Unknown"}{" "}
          <Button variant="link" onClick={() => refetch()} className="h-auto p-0 text-red-700">
            Retry
          </Button>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading tasks…</Card>
      ) : (
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
          {COLUMNS.map((col) => {
            const items = columns[col.status];
            const isHover = hoverCol === col.status && dragId !== null;
            return (
              <div
                key={col.status}
                onDragOver={(e) => {
                  if (dragId) {
                    e.preventDefault();
                    if (hoverCol !== col.status) setHoverCol(col.status);
                  }
                }}
                onDragLeave={() => {
                  if (hoverCol === col.status) setHoverCol(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(col.status);
                }}
                className={`flex w-[80vw] shrink-0 snap-start flex-col gap-3 rounded-lg border bg-muted/30 p-3 transition sm:w-[60vw] md:w-[380px] lg:w-auto ${
                  isHover ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{col.title}</h2>
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDialogMode({ kind: "create", status: col.status })}
                    className="tap-target inline-flex items-center justify-center rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                    aria-label={`Add to ${col.title}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {items.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                      Drop here
                    </div>
                  ) : (
                    items.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        dragging={dragId === task.id}
                        onDragStart={() => setDragId(task.id)}
                        onClick={() => setDialogMode({ kind: "edit", task })}
                        onDelete={() => handleDelete(task.id, task.title)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={dialogMode.kind === "create"}
        onClose={() => setDialogMode({ kind: "closed" })}
        title="New task"
      >
        {dialogMode.kind === "create" && (
          <TaskForm
            submitLabel="Create task"
            busy={create.isPending}
            initial={{ status: dialogMode.status ?? "todo" }}
            onCancel={() => setDialogMode({ kind: "closed" })}
            onSubmit={async (input) => {
              const p = create.mutateAsync(input);
              if (isOffline()) {
                p.catch(() => undefined);
                setDialogMode({ kind: "closed" });
                return;
              }
              await p;
              setDialogMode({ kind: "closed" });
            }}
          />
        )}
      </Modal>

      <Modal
        open={dialogMode.kind === "edit"}
        onClose={() => setDialogMode({ kind: "closed" })}
        title="Edit task"
      >
        {dialogMode.kind === "edit" && (
          <TaskForm
            submitLabel="Save changes"
            busy={update.isPending}
            initial={{
              title: dialogMode.task.title,
              description: dialogMode.task.description ?? "",
              clientId: dialogMode.task.clientId ?? "",
              assigneeId: dialogMode.task.assigneeId ?? "",
              priority: dialogMode.task.priority,
              status: dialogMode.task.status,
              dueDate: dialogMode.task.dueDate ? dialogMode.task.dueDate.slice(0, 10) : "",
              recurring: dialogMode.task.recurring,
            }}
            onCancel={() => setDialogMode({ kind: "closed" })}
            onSubmit={async (input) => {
              const p = update.mutateAsync({ id: dialogMode.task.id, input });
              if (isOffline()) {
                p.catch(() => undefined);
                setDialogMode({ kind: "closed" });
                return;
              }
              await p;
              setDialogMode({ kind: "closed" });
            }}
          />
        )}
      </Modal>
    </section>
  );
}
