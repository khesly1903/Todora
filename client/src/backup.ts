import type { ExportNode } from "./api";
import { buildTree, groupTasksByArea } from "./tree";
import type { Area, Task } from "./types";

/** Build the nested export tree (areas → children + tasks) from flat areas/tasks. */
export function buildExport(areas: Area[], tasks: Task[]): ExportNode[] {
  const roots = buildTree(areas);
  const tasksByArea = groupTasksByArea(tasks);

  function toNode(area: { id: string; name: string; children: typeof roots }): ExportNode {
    return {
      name: area.name,
      tasks: (tasksByArea.get(area.id) ?? []).map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        tags: t.tags,
        dueAt: t.dueAt,
        description: t.description,
        completedAt: t.completedAt,
      })),
      children: area.children.map(toNode),
    };
  }
  return roots.map(toNode);
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Reads a user-selected JSON file and returns its parsed contents. */
export function pickJsonFile(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error("No file selected"));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result)));
        } catch {
          reject(new Error("Invalid JSON file"));
        }
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsText(file);
    };
    input.click();
  });
}
