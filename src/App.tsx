import { useMemo, useState } from "react";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import BucketItem from "./BucketItem";
import BucketSection from "./BucketSection";
import type { BucketItemData, BucketStatus } from "./BucketItem";

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
    accent: "#9ca3a9",
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

export default function App() {
  const [items, setItems] = useState<BucketItemData[]>(INITIAL_ITEMS);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Record<BucketStatus, boolean>>({
    done: false,
    soon: false,
    want: false,
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
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

  const addItem = (status: BucketStatus, text: string) => {
    setItems((current) => {
      const newItem: BucketItemData = {
        id: Date.now(),
        text,
        status,
      };

      const firstIndex = current.findIndex((item) => item.status === status);

      if (firstIndex === -1) {
        return [...current, newItem];
      }

      const next = [...current];
      next.splice(firstIndex, 0, newItem);
      return next;
    });
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
    if (!over || typeof active.id !== "number") {
      setActiveId(null);
      return;
    }

    setItems((current) => {
      const activeIndex = current.findIndex((item) => item.id === active.id);

      if (activeIndex === -1) {
        return current;
      }

      const draggedItem = current[activeIndex];
      const overData = over.data.current;

      if (
        overData?.type === "empty-section" &&
        isBucketStatus(overData.status)
      ) {
        const withoutDragged = current.filter(
          (item) => item.id !== active.id,
        );

        return [
          ...withoutDragged,
          {
            ...draggedItem,
            status: overData.status,
          },
        ];
      }

      if (typeof over.id !== "number") {
        return current;
      }

      const overIndex = current.findIndex((item) => item.id === over.id);

      if (overIndex === -1) {
        return current;
      }

      const targetItem = current[overIndex];
      const next = [...current];

      next[activeIndex] = {
        ...draggedItem,
        status: targetItem.status,
      };

      return arrayMove(next, activeIndex, overIndex);
    });

    setActiveId(null);
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
                <BucketSection
                  key={status}
                  status={status}
                  meta={meta}
                  items={sectionItems}
                  collapsed={collapsed[status]}
                  onToggle={() => toggleSection(status)}
                  onAdd={addItem}
                  onDelete={deleteItem}
                />
              ))}
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
