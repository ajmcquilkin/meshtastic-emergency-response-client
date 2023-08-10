import React from "react";
import { useTranslation } from "react-i18next";
import TimeAgo from "timeago-react";
import { Locate, LocateFixed } from "lucide-react";

import type { app_device_MeshNode } from "@bindings/index";

import DefaultTooltip from "@components/DefaultTooltip";

import { useComponentReload } from "@utils/hooks";
import {
  getColorClassFromNodeState,
  getLastHeardTime,
  getNodeState,
  getMinsSinceLastHeard,
} from "@utils/nodes";
import { formatLocation } from "@utils/map";

export interface INodeSearchResultProps {
  node: app_device_MeshNode;
  isActive: boolean;
  selectNode: (nodeId: number) => void;
}

const NodeSearchResult = ({
  node,
  isActive,
  selectNode,
}: INodeSearchResultProps) => {
  const { t, i18n } = useTranslation();

  useComponentReload(1000);

  const lastPacketTime = getLastHeardTime(node);
  const nodeState = getNodeState(getMinsSinceLastHeard(node), isActive);
  const colorClasses = getColorClassFromNodeState(nodeState);

  return (
    <div className="flex flex-row gap-4">
      <div className={`flex-grow ${colorClasses.text}`}>
        <p className="text-lg font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
          {node.user?.longName ?? node.nodeNum}
          <span className="pl-2 text-xs font-normal">
            {lastPacketTime ? (
              <TimeAgo
                datetime={lastPacketTime * 1000}
                locale={i18n.language}
              />
            ) : (
              t("general.unknown")
            )}
          </span>
        </p>
        <p className="text-sm font-light">
          {!!node.positionMetrics.at(-1)?.latitude ||
          !!node.positionMetrics.at(-1)?.longitude
            ? `${formatLocation(
                node.positionMetrics.at(-1)?.latitude ?? 0
              )}, ${formatLocation(
                node.positionMetrics.at(-1)?.longitude ?? 0
              )}`
            : t("map.panes.search.noGpsLock")}
        </p>
      </div>

      <DefaultTooltip
        text={
          isActive
            ? t("map.panes.search.deselectNode")
            : t("map.panes.search.selectNode")
        }
      >
        <button
          type="button"
          onClick={
            isActive
              ? () => selectNode(node.nodeNum)
              : () => selectNode(node.nodeNum)
          }
        >
          {isActive ? (
            <LocateFixed
              className={`w-6 h-6 mx-0 my-auto ${colorClasses.text} hover:cursor-pointer`}
              strokeWidth={1.5}
            />
          ) : (
            <Locate
              className={`w-6 h-6 mx-0 my-auto ${colorClasses.text} hover:cursor-pointer`}
              strokeWidth={1.5}
            />
          )}
        </button>
      </DefaultTooltip>
    </div>
  );
};

export default NodeSearchResult;
