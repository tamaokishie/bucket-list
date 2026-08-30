import { useMemo, useState } from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Button from "@mui/material/Button";
import "./App.css";

type BucketStatus = "done" | "soon" | "want";

type BucketItem = {
  id: number;
  text: string;
  status: BucketStatus;
};

const statusMeta: Record<
  BucketStatus,
  { label: string; accent: string; background: string; border: string }
> = {
  done: {
    label: "Done",
    accent: "#2d9c6e",
    background: "#eaf8ef",
    border: "#a9d9b8",
  },
  soon: {
    label: "In Progress",
    accent: "#c95ca7",
    background: "#f7e3f3",
    border: "#d9afd0",
  },
  want: {
    label: "To Do",
    accent: "#d7d7d7",
    background: "#f5f5f5",
    border: "#d9d9d9",
  },
};

const initialItems: BucketItem[] = [
  { id: 1, text: "ファンデ買う", status: "done" },
  { id: 2, text: "資格の勉強を終える", status: "done" },
  { id: 3, text: "部屋を片付ける", status: "done" },
  { id: 4, text: "福岡行く", status: "soon" },
  { id: 5, text: "カメラを買う", status: "soon" },
  { id: 6, text: "サーフボード買う", status: "want" },
  { id: 7, text: "台湾でランタン飛ばす", status: "want" },
  { id: 8, text: "スカイダイビングする", status: "want" },
];

const statusOrder: BucketStatus[] = ["done", "soon", "want"];

function App() {
  const [items, setItems] = useState<BucketItem[]>(initialItems);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const sections = useMemo(
    () =>
      statusOrder.map((status) => ({
        status,
        meta: statusMeta[status],
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
      const sourceIndex = current.findIndex((item) => item.id === itemId);
      if (sourceIndex === -1) return current;

      const moved = { ...current[sourceIndex], status: nextStatus };
      const withoutSource = current.filter((item) => item.id !== itemId);

      if (targetId === undefined) {
        return [...withoutSource, moved];
      }

      const targetIndex = withoutSource.findIndex(
        (item) => item.id === targetId,
      );
      if (targetIndex === -1) {
        return [...withoutSource, moved];
      }

      const nextItems = [...withoutSource];
      nextItems.splice(targetIndex, 0, moved);
      return nextItems;
    });
  };

  const handleAddItem = () => {
    const value = draft.trim();
    if (!value) return;

    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        text: value,
        status: "want",
      },
    ]);
    setDraft("");
  };

  const deleteItem = (itemId: number) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  };

  const renderItem = (item: BucketItem) => (
    <div
      key={item.id}
      className="bucket-item-wrapper"
      draggable
      onDragStart={(event: React.DragEvent<HTMLDivElement>) => {
        event.dataTransfer!.effectAllowed = "move";
        setDraggedId(item.id);
      }}
      onDragEnd={() => setDraggedId(null)}
      onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer!.dropEffect = "move";
      }}
      onDrop={(event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (draggedId !== null && draggedId !== item.id) {
          moveItem(draggedId, item.status, item.id);
        }
      }}
    >
      <div className={`bucket-item bucket-item--${item.status}`}>
        <span className="bucket-item__handle" aria-label="ドラッグして並び替え">
          ⋮⋮
        </span>
        <span
          className={`bucket-item__marker bucket-item__marker--${item.status}`}
        >
          {item.status === "done" ? "✓" : item.status === "soon" ? "♥" : "•"}
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
                style={{
                  ["--section-accent" as string]: meta.accent,
                  ["--section-bg" as string]: meta.background,
                  ["--section-border" as string]: meta.border,
                }}
                onDragOver={(event: React.DragEvent<HTMLElement>) => {
                  event.preventDefault();
                  event.dataTransfer!.dropEffect = "move";
                }}
                onDrop={(event: React.DragEvent<HTMLElement>) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (draggedId !== null) {
                    moveItem(draggedId, status);
                  }
                }}
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
                if (event.key === "Enter") {
                  handleAddItem();
                }
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
              onClick={handleAddItem}
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
