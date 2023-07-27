import React, { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useMap } from "react-map-gl";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";

import type {
  app_device_MeshDevice,
  app_device_MeshNode,
} from "@bindings/index";

import DefaultTooltip from "@components/DefaultTooltip";
import NodeSearchInput from "@components/NodeSearch/NodeSearchInput";
import NodeSearchResult from "@components/NodeSearch/NodeSearchResult";

import {
  selectActiveNodeId,
  selectDevice,
  selectAllNodes,
} from "@features/device/deviceSelectors";
import { deviceSliceActions } from "@features/device/deviceSlice";
import { selectMapUIState } from "@features/map/mapSelectors";
import { mapSliceActions } from "@features/map/mapSlice";

import { MapIDs, getFlyToConfig } from "@utils/map";

interface _INodeSearchDockProps {
  filteredNodes: app_device_MeshNode[];
  device: app_device_MeshDevice | null;
  activeNodeId: number | null;
  query: string;
  handleNodeSelect: (nodeId: number) => void;
}

const _NodeSearchDock = ({
  filteredNodes,
  device,
  activeNodeId,
  query,
  handleNodeSelect,
}: _INodeSearchDockProps) => {
  if (!filteredNodes.length && !!device) {
    return (
      <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
        <Trans i18nKey="map.panes.search.noResults" values={{ query }} />
      </p>
    );
  }

  if (filteredNodes.length) {
    return (
      <>
        {filteredNodes.map((node) => (
          <NodeSearchResult
            key={node.nodeNum}
            node={node}
            isActive={node.nodeNum === activeNodeId}
            selectNode={handleNodeSelect}
          />
        ))}
      </>
    );
  }

  return <></>;
};

const filterNodes =
  (query: string) =>
  (node: app_device_MeshNode): boolean => {
    // Show all nodes on empty query
    if (!query) {
      return true;
    }

    const lowercaseQuery = query.toLocaleLowerCase();

    if (String(node.nodeNum).includes(lowercaseQuery)) return true;

    if (node.user?.shortName?.toLocaleLowerCase().includes(lowercaseQuery))
      return true;

    if (node.user?.longName?.toLocaleLowerCase().includes(lowercaseQuery))
      return true;

    return false;
  };

const NodeSearchDock = () => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const { [MapIDs.MapView]: map } = useMap();

  const nodes = useSelector(selectAllNodes());
  const device = useSelector(selectDevice());
  const activeNodeId = useSelector(selectActiveNodeId());
  const { searchDockExpanded } = useSelector(selectMapUIState());

  const [query, setQuery] = useState("");

  const handleNodeSelect = (nodeId: number) => {
    const isNodeActive = activeNodeId === nodeId;
    dispatch(deviceSliceActions.setActiveNode(isNodeActive ? null : nodeId));

    // Only animate when node is not currently active
    if (isNodeActive) return;

    const foundNode = nodes.find((node) => node.nodeNum === nodeId);
    const nodePosition = foundNode?.positionMetrics.at(-1);

    if (!nodePosition) return;

    map?.flyTo(
      getFlyToConfig({
        lat: nodePosition.latitude,
        lng: nodePosition.longitude,
      })
    );
  };

  const setNodeSearchDockExpanded = (isExpanded: boolean) => {
    dispatch(mapSliceActions.setMapUIState({ searchDockExpanded: isExpanded }));
  };

  return (
    <div className="absolute left-9 top-9 w-96 flex flex-col p-4 gap-4">
      <div className="flex flex-row gap-4">
        <NodeSearchInput
          query={query}
          setQuery={setQuery}
          placeholder={t("map.panes.search.placeholder")}
        />
      </div>

      {searchDockExpanded && (
        <div className="flex flex-col gap-4 px-4 py-3 default-overlay overflow-auto hide-scrollbar max-h-72">
          <_NodeSearchDock
            filteredNodes={nodes.filter(filterNodes(query))}
            device={device}
            activeNodeId={activeNodeId}
            query={query}
            handleNodeSelect={handleNodeSelect}
          />
        </div>
      )}

      <DefaultTooltip
        text={
          searchDockExpanded
            ? t("map.panes.search.collapseList")
            : t("map.panes.search.expandList")
        }
        side="right"
      >
        <button
          onClick={() => setNodeSearchDockExpanded(!searchDockExpanded)}
          className="flex flex-row align-middle justify-center bg-white dark:bg-gray-800 rounded-full mx-auto p-2 shadow-lg text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
        >
          {searchDockExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>
      </DefaultTooltip>
    </div>
  );
};

export default NodeSearchDock;
