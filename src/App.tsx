import { useEffect, useMemo, useState } from "react";

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

type ApiBucketStatus = "TODO" | "IN_PROGRESS" | "DONE";

type ApiBucketItem = {
  id: number;
  title: string;
  status: ApiBucketStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const API_URL = "http://localhost:8080";

const STATUS_TO_API: Record<BucketStatus, ApiBucketStatus> = {
  done: "DONE",
  soon: "IN_PROGRESS",
  want: "TODO",
};

const API_TO_STATUS: Record<ApiBucketStatus, BucketStatus> = {
  DONE: "done",
  IN_PROGRESS: "soon",
  TODO: "want",
};

const fromApiItem = (item: ApiBucketItem): BucketItemData => ({
  id: item.id,
  text: item.title,
  status: API_TO_STATUS[item.status],
});

export default function App() {
  const [items, setItems] = useState<BucketItemData[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Record<BucketStatus, boolean>>({
    done: false,
    soon: false,
    want: false,
  });

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await fetch(`${API_URL}/api/items`);

        if (!response.ok) {
          throw new Error(`取得に失敗しました: ${response.status}`);
        }

        const data: ApiBucketItem[] = await response.json();

        setItems(data.map(fromApiItem));
      } catch (error) {
        console.error(error);
        alert("やりたいことリストの取得に失敗しました");
      }
    };

    void loadItems();
  }, []);

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

  const addItem = async (status: BucketStatus, text: string) => {
    const title = text.trim();

    if (!title) {
      return;
    }

    const sortOrder = items.filter((item) => item.status === status).length;

    try {
      const response = await fetch("http://localhost:8080/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          status: STATUS_TO_API[status],
          sortOrder,
        }),
      });

      if (!response.ok) {
        throw new Error(`登録エラー: ${response.status}`);
      }

      const savedItem: ApiBucketItem = await response.json();

      const newItem: BucketItemData = {
        id: savedItem.id,
        text: savedItem.title,
        status: API_TO_STATUS[savedItem.status],
      };

      setItems((current) => [...current, newItem]);
    } catch (error) {
      console.error(error);
      alert("アイテムを登録できませんでした");
    }
  };
  const deleteItem = async (itemId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/items/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`削除エラー: ${response.status}`);
      }

      setItems((current) => current.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error(error);
      alert("アイテムを削除できませんでした");
    }
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
        const withoutDragged = current.filter((item) => item.id !== active.id);

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
