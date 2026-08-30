import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Button from "@mui/material/Button";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import BucketItem from "./BucketItem";
import type { BucketItemData, BucketStatus } from "./BucketItem";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import "./App.css";

type StatusMeta = {
  label: string;
  accent: string;
  background: string;
  border: string;
  marker: string;
};

const STATUS_ORDER: BucketStatus[] = ["done", "soon", "want"];

const STATUS_META: Record<BucketStatus, StatusMeta> = {
  done: {
    label: "Done",
    accent: "#2d9c6e",
    background: "#eaf8ef",
    border: "#a9d9b8",
    marker: "✓",
  },
  soon: {
    label: "In Progress",
    accent: "#c95ca7",
    background: "#f7e3f3",
    border: "#d9afd0",
    marker: "♥",
  },
  want: {
    label: "To Do",
    accent: "#d7d7d7",
    background: "#f5f5f5",
    border: "#d9d9d9",
    marker: "•",
  },
};

const INITIAL_ITEMS: BucketItemData[] = [
  { id: 1, text: "ファンデ買う", status: "done" },
  { id: 2, text: "資格の勉強を終える", status: "done" },
  { id: 3, text: "部屋を片付ける", status: "done" },
  { id: 4, text: "福岡行く", status: "soon" },
  { id: 5, text: "カメラを買う", status: "soon" },
  { id: 6, text: "サーフボード買う", status: "want" },
  { id: 7, text: "台湾でランタン飛ばす", status: "want" },
  { id: 8, text: "スカイダイビングする", status: "want" },
];

const isBucketStatus = (value: unknown): value is BucketStatus =>
  value === "done" || value === "soon" || value === "want";

type EmptyDropZoneProps = {
  status: BucketStatus;
};

function EmptyDropZone({ status }: EmptyDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `empty-${status}`,
    data: {
      type: "empty-section",
      status,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`bucket-section__empty-drop${
        isOver ? " bucket-section__empty-drop--over" : ""
      }`}
    >
      ここに追加
    </div>
  );
}

function App() {
  const [items, setItems] = useState<BucketItemData[]>(INITIAL_ITEMS);
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Record<BucketStatus, boolean>>({
    done: false,
    soon: false,
    want: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 10,
      },
    }),
  );

  const sections = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        meta: STATUS_META[status],
        items: items.filter((item) => item.status === status),
      })),
    [items],
  );

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? null,
    [activeId, items],
  );

  const toggleSection = (status: BucketStatus) => {
    setCollapsed((current) => ({
      ...current,
      [status]: !current[status],
    }));
  };

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;

    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        text,
        status: "want",
      },
    ]);

    setDraft("");
  };

  const deleteItem = (itemId: number) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    if (typeof active.id === "number") {
      setActiveId(active.id);
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);

    if (!over || typeof active.id !== "number") return;

    setItems((current) => {
      const activeIndex = current.findIndex((item) => item.id === active.id);
      if (activeIndex === -1) return current;

      const draggedItem = current[activeIndex];
      const overData = over.data.current;

      if (
        overData?.type === "empty-section" &&
        isBucketStatus(overData.status)
      ) {
        const withoutDragged = current.filter((item) => item.id !== active.id);

        return [
          ...withoutDragged,
          {
            ...draggedItem,
            status: overData.status,
          },
        ];
      }

      if (typeof over.id !== "number") return current;

      const overIndex = current.findIndex((item) => item.id === over.id);
      if (overIndex === -1) return current;

      const targetItem = current[overIndex];
      const next = [...current];

      next[activeIndex] = {
        ...draggedItem,
        status: targetItem.status,
      };

      return arrayMove(next, activeIndex, overIndex);
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="app-shell">
        <div className="app-layout">
          <main className="list-panel">
            <div className="board-columns">
              {sections.map(({ status, meta, items: sectionItems }) => (
                <section
                  key={status}
                  className="bucket-section"
                  style={
                    {
                      "--section-accent": meta.accent,
                      "--section-bg": meta.background,
                      "--section-border": meta.border,
                    } as CSSProperties
                  }
                >
                  <button
                    type="button"
                    className="bucket-section__header"
                    onClick={() => toggleSection(status)}
                    aria-expanded={!collapsed[status]}
                    aria-controls={`bucket-list-${status}`}
                  >
                    <span>{meta.label}</span>
                    <ExpandMoreIcon
                      className={`bucket-section__chevron${
                        collapsed[status]
                          ? " bucket-section__chevron--collapsed"
                          : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  {!collapsed[status] && (
                    <SortableContext
                      items={sectionItems.map((item) => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div
                        id={`bucket-list-${status}`}
                        className="bucket-section__list"
                      >
                        {sectionItems.map((item) => (
                          <BucketItem
                            key={item.id}
                            item={item}
                            marker={STATUS_META[item.status].marker}
                            onDelete={deleteItem}
                          />
                        ))}

                        {sectionItems.length === 0 && (
                          <EmptyDropZone status={status} />
                        )}
                      </div>
                    </SortableContext>
                  )}
                </section>
              ))}
            </div>

            <div className="add-item-row">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addItem();
                }}
                placeholder="Add a new task"
                aria-label="Add a new task"
              />

              <Button
                variant="contained"
                size="small"
                sx={{
                  backgroundColor: "#b0b7bd",
                  color: "#ffffff",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#9ca3a9",
                  },
                }}
                onClick={addItem}
              >
                Add
              </Button>
            </div>
          </main>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <BucketItem
            item={activeItem}
            marker={STATUS_META[activeItem.status].marker}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
