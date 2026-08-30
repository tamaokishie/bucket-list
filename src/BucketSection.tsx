import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import IconButton from "@mui/material/IconButton";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";


import BucketItem from "./BucketItem";
import type { BucketItemData, BucketStatus } from "./BucketItem";

type StatusMeta = {
  label: string;
  accent: string;
  background: string;
  border: string;
  marker: string;
};

type BucketSectionProps = {
  status: BucketStatus;
  meta: StatusMeta;
  items: BucketItemData[];
  collapsed: boolean;
  onToggle: () => void;
  onAdd: (status: BucketStatus, text: string) => void;
  onDelete: (itemId: number) => void;
};

export default function BucketSection({
  status,
  meta,
  items,
  collapsed,
  onToggle,
  onAdd,
  onDelete,
}: BucketSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: `empty-${status}`,
    data: {
      type: "empty-section",
      status,
    },
    disabled: items.length > 0,
  });

  useEffect(() => {
    if (isAdding && !collapsed) {
      inputRef.current?.focus();
    }
  }, [isAdding, collapsed]);

  const startAdding = () => {
    setIsAdding(true);

    if (collapsed) {
      onToggle();
    }
  };

  const cancelAdding = () => {
    setDraft("");
    setIsAdding(false);
  };

  const submit = () => {
    const text = draft.trim();

    if (!text) {
      cancelAdding();
      return;
    }

    onAdd(status, text);
    setDraft("");
    setIsAdding(false);
  };

  return (
    <section
      className="bucket-section"
      style={
        {
          "--section-accent": meta.accent,
          "--section-bg": meta.background,
          "--section-border": meta.border,
        } as CSSProperties
      }
    >
      <div className="bucket-section__header">
        <button
          type="button"
          className="bucket-section__toggle"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={`${meta.label}を${collapsed ? "開く" : "閉じる"}`}
        >
          <ExpandMoreIcon
            className={`bucket-section__chevron${
              collapsed ? " bucket-section__chevron--collapsed" : ""
            }`}
          />

          <span>{meta.label}</span>
        </button>

        <IconButton
          size="small"
          className="bucket-section__add"
          aria-label={`${meta.label}にタスクを追加`}
          onClick={startAdding}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </div>

      {!collapsed && (
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="bucket-section__list">
            {isAdding && (
              <div className="bucket-add-row">
                <span
                  className={`bucket-item__marker bucket-item__marker--${status}`}
                >
                  {meta.marker}
                </span>

                <input
                  ref={inputRef}
                  value={draft}
                  placeholder="新しいタスク"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      submit();
                    }

                    if (event.key === "Escape") {
                      cancelAdding();
                    }
                  }}
                />

                <IconButton
                  size="small"
                  aria-label="追加"
                  onClick={submit}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>

                <IconButton
                  size="small"
                  aria-label="キャンセル"
                  onClick={cancelAdding}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </div>
            )}

            {items.map((item) => (
              <BucketItem
                key={item.id}
                item={item}
                marker={meta.marker}
                onDelete={onDelete}
              />
            ))}

            {!isAdding && items.length === 0 && (
              <div
                ref={setNodeRef}
                className={`bucket-section__empty-drop${
                  isOver ? " bucket-section__empty-drop--over" : ""
                }`}
              >
                ここに追加
              </div>
            )}
          </div>
        </SortableContext>
      )}
    </section>
  );
}
