import type { Course } from "../types";

interface Props {
  bookmarks: string[];
  courseByCode: Map<string, Course>;
  onSelect: (code: string) => void;
  onRemove: (code: string) => void;
}

export default function BookmarksBar({ bookmarks, courseByCode, onSelect, onRemove }: Props) {
  if (bookmarks.length === 0) return null;

  return (
    <div className="bookmarks-panel">
      <div className="bookmarks-panel-head">
        <h3>Bookmarked courses ({bookmarks.length})</h3>
      </div>
      <div className="bookmarks-chips">
        {bookmarks.map((code) => {
          const course = courseByCode.get(code);
          return (
            <div className="bookmark-chip" key={code} onClick={() => onSelect(code)}>
              <span className="bookmark-chip-code">{code}</span>
              <span>{course?.title ?? code}</span>
              <button
                type="button"
                className="bookmark-chip-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(code);
                }}
                title="Remove bookmark"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
