import PathwayGraph from "./PathwayGraph";
import type { PathwayGraph as PathwayGraphData } from "../pathways";
import type { PrerequisiteCheck } from "../prerequisiteCheck";

interface Props {
  graph: PathwayGraphData | null;
  centerCode: string | null;
  onSelectCode: (code: string) => void;
  pickedCodes?: Set<string>;
  bookmarkedCodes?: Set<string>;
  notInterestedCodes?: Set<string>;
  prereqStatusByCode?: Map<string, PrerequisiteCheck>;
}

export default function PathwayGraphPanel({
  graph,
  centerCode,
  onSelectCode,
  pickedCodes,
  bookmarkedCodes,
  notInterestedCodes,
  prereqStatusByCode,
}: Props) {
  if (!centerCode) return null;

  const hasNeighbors = graph && graph.edges.length > 0;

  return (
    <div className="pathway-graph-panel">
      <div className="pathway-graph-panel-head">
        <h3>Pathway graph — {centerCode}</h3>
      </div>
      {hasNeighbors ? (
        <PathwayGraph
          graph={graph}
          centerCode={centerCode}
          onSelectCode={onSelectCode}
          pickedCodes={pickedCodes}
          bookmarkedCodes={bookmarkedCodes}
          notInterestedCodes={notInterestedCodes}
          prereqStatusByCode={prereqStatusByCode}
        />
      ) : (
        <p className="pathway-graph-panel-empty">
          No direct Y12/Y13 pathway links found in the prospectus for this course.
        </p>
      )}
    </div>
  );
}
