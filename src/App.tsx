import { useMemo, useRef, useState } from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Button from "@mui/material/Button";
import "./App.css";

type BucketStatus = "done" | "soon" | "want";

type BucketItem = {
  id: number;
  text: string;
  status: BucketStatus;
};

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

const INITIAL_ITEMS: BucketItem[] = [
  { id: 1, text: "ファンデ買う", status: "done" },
  { id: 2, text: "資格の勉強を終える", status: "done" },
  { id: 3, text: "部屋を片付ける", status: "done" },
  { id: 4, text: "福岡行く", status: "soon" },
  { id: 5, text: "カメラを買う", status: "soon" },
  { id: 6, text: "サーフボード買う", status: "want" },
  { id: 7, text: "台湾でランタン飛ばす", status: "want" },
  { id: 8, text: "スカイダイビングする", status: "want" },
];

const ITEM_SELECTOR = ".bucket-item-wrapper";
const SECTION_SELECTOR = ".bucket-section";

function getDropEffect(event: React.DragEvent) {
  event.preventDefault();

  try {
    event.dataTransfer.dropEffect = "move";
  } catch {
    // Some browsers expose a read-only dataTransfer object.
  }
}

function App() {
  const [items, setItems] = useState<BucketItem[]>(INITIAL_ITEMS);
  const [draft, setDraft] = useState("");
  const draggedIdRef = useRef<number | null>(null);

  const sections = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        meta: STATUS_META[status],
        items: items.filter((item) => item.status === status),
      })),
    [items],
  );

  const moveItem = (
    itemId: number,
    nextStatus: BucketStatus,
    targetId?: number,
  ) => {
    setItems((current) => {
      const source = current.find((item) => item.id === itemId);
      if (!source) return current;

      const movedItem = { ...source, status: nextStatus };
      const remainingItems = current.filter((item) => item.id !== itemId);

      if (targetId === undefined) {
        return [...remainingItems, movedItem];
      }

      const targetIndex = remainingItems.findIndex(
        (item) => item.id === targetId,
      );

      if (targetIndex === -1) {
        return [...remainingItems, movedItem];
      }

      const nextItems = [...remainingItems];
      nextItems.splice(targetIndex, 0, movedItem);
      return nextItems;
    });
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

  const clearDraggedItem = () => {
    draggedIdRef.current = null;
  };

  const getDraggedId = (dataTransfer?: DataTransfer | null) => {
    try {
      const transferredId = Number(dataTransfer?.getData("text/plain"));
      if (Number.isSafeInteger(transferredId) && transferredId > 0) {
        return transferredId;
      }
    } catch {
      // Fall back to the ref when dataTransfer is unavailable.
    }

    return draggedIdRef.current;
  };

  const dropAtPoint = (x: number, y: number) => {
    const draggedId = draggedIdRef.current;
    if (draggedId === null) return;

    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!element) return;

    const itemElement = element.closest(ITEM_SELECTOR) as HTMLElement | null;
    if (itemElement) {
      const targetId = Number(itemElement.dataset.itemId);
      if (!Number.isSafeInteger(targetId) || targetId === draggedId) return;

      const targetItem = items.find((item) => item.id === targetId);
      if (targetItem) {
        moveItem(draggedId, targetItem.status, targetId);
      }
      return;
    }

    const sectionElement = element.closest(
      SECTION_SELECTOR,
    ) as HTMLElement | null;
    const status = sectionElement?.dataset.status as BucketStatus | undefined;

    if (status && STATUS_ORDER.includes(status)) {
      moveItem(draggedId, status);
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    dropAtPoint(touch.clientX, touch.clientY);
    clearDraggedItem();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer may already have been released.
    }

    dropAtPoint(event.clientX, event.clientY);
    clearDraggedItem();
  };

  const handleSectionDrop = (
    event: React.DragEvent<HTMLElement>,
    status: BucketStatus,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const draggedId = getDraggedId(event.dataTransfer);
    if (draggedId !== null) {
      moveItem(draggedId, status);
    }

    clearDraggedItem();
  };

  const handleItemDrop = (
    event: React.DragEvent<HTMLDivElement>,
    targetItem: BucketItem,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const draggedId = getDraggedId(event.dataTransfer);
    if (draggedId !== null && draggedId !== targetItem.id) {
      moveItem(draggedId, targetItem.status, targetItem.id);
    }

    clearDraggedItem();
  };

  const renderItem = (item: BucketItem) => (
    <div
      key={item.id}
      className="bucket-item-wrapper"
      data-item-id={item.id}
      draggable
      onTouchStart={(event) => {
        event.stopPropagation();
        draggedIdRef.current = item.id;
      }}
      onTouchEnd={handleTouchEnd}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") return;

        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture is not supported by every browser/device.
        }

        event.stopPropagation();
        draggedIdRef.current = item.id;
      }}
      onPointerUp={handlePointerUp}
      onDragStart={(event) => {
        try {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", String(item.id));
        } catch {
          // Fall back to draggedIdRef.
        }

        draggedIdRef.current = item.id;
      }}
      onDragEnd={clearDraggedItem}
      onDragOver={getDropEffect}
      onDrop={(event) => handleItemDrop(event, item)}
    >
      <div className={`bucket-item bucket-item--${item.status}`}>
        <span className="bucket-item__handle" aria-label="ドラッグして並び替え">
          ⋮⋮
        </span>

        <span
          className={`bucket-item__marker bucket-item__marker--${item.status}`}
        >
          {STATUS_META[item.status].marker}
        </span>

        <span className="bucket-item__text">{item.text}</span>

        <button
          type="button"
          className="bucket-item__delete"
          aria-label={`${item.text}を削除`}
          onClick={() => deleteItem(item.id)}
        >
          <DeleteOutlineIcon fontSize="small" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <div className="app-layout">
        <main className="list-panel">
          <div className="board-columns">
            {sections.map(({ status, meta, items: sectionItems }) => (
              <section
                key={status}
                className="bucket-section"
                data-status={status}
                style={
                  {
                    "--section-accent": meta.accent,
                    "--section-bg": meta.background,
                    "--section-border": meta.border,
                  } as React.CSSProperties
                }
                onDragOver={getDropEffect}
                onDrop={(event) => handleSectionDrop(event, status)}
              >
                <div className="bucket-section__header">{meta.label}</div>

                <div className="bucket-section__list">
                  {sectionItems.length > 0 ? (
                    sectionItems.map(renderItem)
                  ) : (
                    <div className="bucket-section__empty">ここに入れます</div>
                  )}
                </div>
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
  );
}

export default App;
