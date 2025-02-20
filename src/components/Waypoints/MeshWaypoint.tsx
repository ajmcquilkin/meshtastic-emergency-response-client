import { Marker, MarkerProps } from "react-map-gl/maplibre";

import type { app_device_NormalizedWaypoint } from "@bindings/index";
import { WaypointIcon } from "@components/Waypoints/WaypointIcon";

// This component returns a marker for each individual waypoint. It is called from MapView.tsx
export interface IMeshWaypointProps
  extends Pick<MarkerProps, "draggable" | "onDragEnd"> {
  waypoint: app_device_NormalizedWaypoint;
  isSelected: boolean;
  onClick?: () => void;
}

// All references to currWaypoint being null don't end up getting used because if it's null then we return <></>
export const MeshWaypoint = ({
  waypoint,
  isSelected,
  onClick,
  ...props
}: IMeshWaypointProps) => {
  return (
    <Marker
      latitude={waypoint.latitude}
      longitude={waypoint.longitude}
      anchor="center"
      {...props}
    >
      <div className="translate-y-[2px]">
        <button
          type="button"
          onClick={onClick}
          className={`${
            onClick
              ? "cursor-pointer"
              : props.draggable
                ? "cursor-move"
                : "cursor-default"
          } -translate-y-1/2`}
        >
          <WaypointIcon waypoint={waypoint} isSelected={isSelected} />
        </button>
      </div>
    </Marker>
  );
};
