import React from "react";
import { Marker, MapboxEvent } from "react-map-gl";
import TimeAgo from "timeago-react";

import type { app_device_MeshNode } from "@bindings/index";

import { useComponentReload } from "@utils/hooks";
import {
  getMinsSinceLastHeard,
  getNodeState,
  getHeadingFromNodeState,
  getColorClassFromNodeState,
  getLastHeardTime,
} from "@utils/nodes";

export interface IMapNodeProps {
  node: app_device_MeshNode;
  onClick: (nodeId: number | null) => void;
  isBase?: boolean;
  isActive?: boolean;
}

const MapNode = ({
  node,
  onClick,
  isBase = false,
  isActive = false,
}: IMapNodeProps) => {
  useComponentReload(1000);

  const lastPacketTime = getLastHeardTime(node);
  const nodeState = getNodeState(getMinsSinceLastHeard(node), isActive);
  const headingPrefix = getHeadingFromNodeState(nodeState, isBase);

  const colorClasses = getColorClassFromNodeState(nodeState);

  const handleNodeClick = (e: MapboxEvent<MouseEvent>) => {
    e.originalEvent.preventDefault();
    onClick(node.data.num);
  };

  return (
    <Marker
      latitude={(node.data.position?.latitudeI ?? 0) / 1e7}
      longitude={(node.data.position?.longitudeI ?? 0) / 1e7}
      onClick={handleNodeClick}
    >
      <div className="relative">
        <div
          className="absolute left-2/4 text-center whitespace-nowrap px-2 py-1 default-overlay text-xs"
          style={{ transform: "translate(-50%, -160%)" }}
        >
          {headingPrefix && (
            <span className={`font-bold ${colorClasses.text}`}>
              {headingPrefix}{" "}
            </span>
          )}
          <span className={`font-normal ${colorClasses.text}`}>
            {node.data.user?.longName ?? node.data.num}
          </span>
          {(nodeState === "warning" || nodeState === "error") && (
            <span className={`font-normal ${colorClasses.text}`}>
              {" "}
              {lastPacketTime ? (
                <TimeAgo datetime={lastPacketTime} locale="en-us" live />
              ) : (
                "UNK"
              )}
            </span>
          )}
        </div>
      </div>
    </Marker>
  );
};

export default MapNode;
