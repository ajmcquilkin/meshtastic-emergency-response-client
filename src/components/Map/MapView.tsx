import { MapboxOverlay, MapboxOverlayProps } from "@deck.gl/mapbox/typed";
import * as Dialog from "@radix-ui/react-dialog";
import * as Separator from "@radix-ui/react-separator";
import { PickingInfo } from "deck.gl/typed";
import { MapPin, X } from "lucide-react";
import maplibregl from "maplibre-gl";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LngLat,
  // biome-ignore lint/suspicious/noShadowRestrictedNames: Need named export
  Map,
  MapLayerMouseEvent,
  Marker,
  NavigationControl,
  ScaleControl,
  ViewState,
  ViewStateChangeEvent,
  useControl,
} from "react-map-gl";
import { useDispatch, useSelector } from "react-redux";
import { useDebounce } from "react-use";

import type { app_device_NormalizedWaypoint } from "@bindings/index";

import { MapSelectedNodeMenu } from "@components/Map/MapSelectedNodeMenu";
import { NodeSearchDock } from "@components/NodeSearch/NodeSearchDock";

import { CreateWaypointDialog } from "@components/Map/CreateWaypointDialog";
import { MapContextOption } from "@components/Map/MapContextOption";
import { MapNodeTooltip } from "@components/Map/MapNodeTooltip";
import { MapEdgeTooltip } from "@components/Map/MapEdgeTooltip";
import { createGraphNodesLayer } from "@components/Map/layers/graphNodes";
import { createGraphEdgesLayer } from "@components/Map/layers/graphEdges";

import { MeshWaypoint } from "@components/Waypoints/MeshWaypoint";
import { WaypointMenu } from "@components/Waypoints/WaypointMenu";

import { selectMapConfigState } from "@features/appConfig/selectors";
import { selectAllNodes, selectAllWaypoints } from "@features/device/selectors";
import { selectGraph } from "@features/graph/selectors";
import { selectMapState } from "@features/map/selectors";
import { mapSliceActions } from "@features/map/slice";
import {
  selectActiveNodeId,
  selectActiveWaypoint,
  selectInfoPane,
} from "@features/ui/selectors";
import { uiSliceActions } from "@features/ui/slice";

import { MapIDs } from "@utils/map";

import "@components/Map/MapView.css";

import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@components/ErrorFallback";
export interface IDeckGLOverlayProps extends MapboxOverlayProps {
  interleaved?: boolean;
}

const DeckGLOverlay = (props: IDeckGLOverlayProps) => {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));

  overlay.setProps(props);

  return null;
};

export const MapView = () => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const activeNodeId = useSelector(selectActiveNodeId());
  const showInfoPane = useSelector(selectInfoPane());
  const graph = useSelector(selectGraph());
  const nodes = useSelector(selectAllNodes());

  const { viewState } = useSelector(selectMapState());
  const { style } = useSelector(selectMapConfigState());

  const waypoints = useSelector(selectAllWaypoints());
  const activeWaypoint = useSelector(selectActiveWaypoint());

  const [nodeHoverInfo, setNodeHoverInfo] = useState<PickingInfo | null>(null);
  const [edgeHoverInfo, setEdgeHoverInfo] = useState<PickingInfo | null>(null);
  const [isWaypointDialogOpen, setWaypointDialogOpen] = useState(false);

  const [contextMenuEvent, setContextMenuEvent] =
    useState<MapLayerMouseEvent | null>(null);

  const [editingWaypoint, setEditingWaypoint] =
    useState<app_device_NormalizedWaypoint | null>(null);

  const [lastRightClickLngLat, setLastRightClickLngLat] =
    useState<LngLat | null>(null);

  const [localViewState, setLocalViewState] =
    useState<Partial<ViewState>>(viewState);

  const handleNodeClick = useCallback(
    (info: PickingInfo) => {
      console.warn("Node click", info);
      const nodeId: number | null = info.object?.properties?.num ?? null;

      if (nodeId === activeNodeId) {
        dispatch(uiSliceActions.setActiveNode(null));
        return;
      }

      dispatch(uiSliceActions.setActiveNode(nodeId));
    },
    [activeNodeId, dispatch],
  );

  const layers = [
    createGraphEdgesLayer(graph, nodes, setEdgeHoverInfo), // Need this above nodes
    createGraphNodesLayer(
      graph,
      nodes,
      activeNodeId,
      handleNodeClick,
      setNodeHoverInfo,
    ),
  ];

  const handleClick = () => {
    // Clear right click menu while saving value
    setContextMenuEvent(null);
  };

  const handleContextMenu = (e: MapLayerMouseEvent) => {
    setContextMenuEvent(e);
    setLastRightClickLngLat(e.lngLat);
  };

  useDebounce(
    () => dispatch(mapSliceActions.setViewState(localViewState)),
    500,
    [localViewState],
  );

  const handleUpdateViewState = (e: ViewStateChangeEvent) => {
    setLocalViewState((prevState) => ({ ...prevState, ...e.viewState }));
  };

  const handleDialogIsOpenChange = (isOpen: boolean) => {
    setWaypointDialogOpen(isOpen);

    // Unmount waypoint dialog to force state reset on close
    if (isOpen) return;
    setLastRightClickLngLat(null);
  };

  return (
    <ErrorBoundary fallbackRender={ErrorFallback}>
      <Dialog.Root
        open={isWaypointDialogOpen}
        onOpenChange={handleDialogIsOpenChange}
      >
        <div
          className="relative w-full h-full z-0"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="z-40">
            {nodeHoverInfo && <MapNodeTooltip hoverInfo={nodeHoverInfo} />}
            {edgeHoverInfo && <MapEdgeTooltip hoverInfo={edgeHoverInfo} />}
          </div>

          {/* Map translation is a pain, assuming users will use translated map tiles https://maplibre.org/maplibre-gl-js/docs/examples/language-switch/ */}

          <Map
            id={MapIDs.MapView}
            reuseMaps={false} // ! Crashes map on switch back to map tab if set to `true`
            mapStyle={style}
            mapLib={maplibregl}
            onDragEnd={handleUpdateViewState}
            onZoomEnd={handleUpdateViewState}
            initialViewState={viewState}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
          >
            <DeckGLOverlay pickingRadius={12} layers={layers} />

            {contextMenuEvent && lastRightClickLngLat && (
              <Marker
                latitude={lastRightClickLngLat.lat}
                longitude={lastRightClickLngLat.lng}
                style={{ zIndex: 30 }}
              >
                <div className="translate-y-1/2">
                  {/* https://www.kindacode.com/article/how-to-create-triangles-with-tailwind-css-4-examples/ */}
                  <div className="w-full">
                    <div className="mx-auto w-0 h-0 border-l-[6px] border-l-transparent border-b-[8px]  border-b-gray-200 dark:border-b-gray-800 border-r-[6px] border-r-transparent" />
                  </div>

                  <div className="flex flex-col gap-2 default-overlay p-2 bg-white dark:bg-gray-800">
                    <Dialog.Trigger asChild>
                      <MapContextOption
                        text={t("map.contextMenu.dropWaypoint")}
                        renderIcon={(c) => (
                          <MapPin className={c} strokeWidth={1.5} />
                        )}
                      />
                    </Dialog.Trigger>

                    <Separator.Root
                      className="h-px w-full bg-gray-200 dark:bg-gray-500"
                      decorative
                      orientation="horizontal"
                    />

                    <MapContextOption
                      text={t("map.contextMenu.close")}
                      renderIcon={(c) => <X className={c} strokeWidth={1.5} />}
                      onClick={() => setContextMenuEvent(null)}
                    />
                  </div>
                </div>
              </Marker>
            )}

            {/* Controls at bottom right */}
            <ScaleControl
              maxWidth={144}
              position="bottom-right"
              unit="imperial"
            />
            <NavigationControl
              position="bottom-right"
              showCompass
              visualizePitch
            />

            {/* Visualize all waypoints */}
            {waypoints
              // Filter invalid locations (falsy lat or long, includes 0,0)
              .filter((w) => !!w.latitude && !!w.longitude)
              .map((w) => (
                <MeshWaypoint
                  key={w.id}
                  waypoint={w}
                  isSelected={activeWaypoint?.id === w.id}
                  onClick={() =>
                    dispatch(
                      uiSliceActions.setActiveWaypoint(
                        activeWaypoint?.id === w.id ? null : w.id,
                      ),
                    )
                  }
                  style={{ zIndex: 10 }}
                />
              ))}
          </Map>

          <div className="z-20">
            <NodeSearchDock />
            <MapSelectedNodeMenu />
            {showInfoPane === "waypoint" ? (
              <WaypointMenu
                editWaypoint={(w) => {
                  setWaypointDialogOpen(true);
                  setEditingWaypoint(w);
                }}
              />
            ) : null}
          </div>
        </div>

        {(lastRightClickLngLat || editingWaypoint) && (
          <CreateWaypointDialog
            lngLat={
              lastRightClickLngLat ??
              ({
                lng: 0,
                lat: 0,
              } as LngLat)
            }
            closeDialog={() => {
              setEditingWaypoint(null);
              setLastRightClickLngLat(null);
              setWaypointDialogOpen(false);
            }}
            existingWaypoint={editingWaypoint}
          />
        )}
      </Dialog.Root>
    </ErrorBoundary>
  );
};
