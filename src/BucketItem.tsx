import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import type { CSSProperties } from "react";

export type BucketStatus = "done" | "soon" | "want";

export type BucketItemData = {
  id: number;
  text: string;
  status: BucketStatus;
};

type BucketItemProps = {
  item: BucketItemData;
  marker: string;
  onDelete?: (itemId: number) => void;
  overlay?: boolean;
};

export default function BucketItem({
  item,
  marker,
  onDelete,
  overlay = false,
}: BucketItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: "item",
      item,
    },
    disabled: overlay,
  });

  const style: CSSProperties | undefined = overlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={`bucket-item-wrapper${isDragging ? " bucket-item-wrapper--dragging" : ""}${overlay ? " bucket-item-wrapper--overlay" : ""}`}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
    >
      <div className={`bucket-item bucket-item--${item.status}`}>
        <span className="bucket-item__handle" aria-label="長押ししてドラッグ">
          ⋮⋮
        </span>

        <span
          className={`bucket-item__marker bucket-item__marker--${item.status}`}
        >
          {marker}
        </span>

        <span className="bucket-item__text">{item.text}</span>

        {!overlay && onDelete && (
          <button
            type="button"
            className="bucket-item__delete"
            aria-label={`${item.text}を削除`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(item.id);
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </button>
        )}
      </div>
    </div>
  );
}
