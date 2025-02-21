import { MapIcon } from "lucide-react";
import maplibregl from "maplibre-gl";
// biome-ignore lint/suspicious/noShadowRestrictedNames: Need named export
import { Map, ScaleControl } from "react-map-gl/maplibre";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { i18next } from "@app/i18n";

import type { app_device_ChannelMessageWithState } from "@bindings/index";

import { MapOverlayButton } from "@components/Map/MapOverlayButton";
import { MeshWaypoint } from "@components/Waypoints/MeshWaypoint";

import { selectMapConfigState } from "@features/appConfig/selectors";
import {
  selectConnectedDeviceNodeId,
  selectUserByNodeId,
} from "@features/device/selectors";
import { uiSliceActions } from "@features/ui/slice";

import { getWaypointMapId } from "@utils/map";
import {
  formatMessageTime,
  formatMessageUsername,
  getPacketDisplayText,
} from "@utils/messaging";
import { AppRoutes } from "@utils/routing";

export interface ITextMessageBubbleProps {
  message: app_device_ChannelMessageWithState;
  className?: string;
}

const getAcknowledgementText = (
  message: app_device_ChannelMessageWithState,
): { text: string; isError: boolean } => {
  if (message.state === "acknowledged") {
    return { text: i18next.t("messaging.acknowledged"), isError: false };
  }

  if (message.state === "pending") {
    return { text: i18next.t("messaging.transmitting"), isError: false };
  }

  return { text: message.state.error, isError: true };
};

export const TextMessageBubble = ({
  message,
  className = "",
}: ITextMessageBubbleProps) => {
  const dispatch = useDispatch();
  const navigateTo = useNavigate();
  const { packet, type } = message.payload;

  const user = useSelector(selectUserByNodeId(packet.from));
  const ownNodeId = useSelector(selectConnectedDeviceNodeId());
  const { style } = useSelector(selectMapConfigState());

  const { displayText: usernameDisplayText, isSelf } = formatMessageUsername(
    user?.longName,
    ownNodeId ?? 0,
    packet.from,
  );

  const handleShowOnMapClick = () => {
    if (type !== "waypoint") return;
    dispatch(uiSliceActions.setActiveWaypoint(message.payload.data.id));
    navigateTo(AppRoutes.MAP);
  };

  if (isSelf) {
    const { text, isError } = getAcknowledgementText(message);

    return (
      <div className={`${className}`}>
        <p className="flex flex-row justify-end mb-1 gap-2 items-baseline">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-400">
            {formatMessageTime(packet.rxTime)}
          </span>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {usernameDisplayText}
          </span>
        </p>

        <div
          className={`ml-auto ${
            type === "waypoint" ? "w-2/5" : "w-fit"
          } max-w-[40%] rounded-l-lg rounded-br-lg border border-gray-200 dark:border-gray-600`}
        >
          <p
            className={`px-3 py-2 rounded-tl-lg bg-gray-700 dark:bg-gray-300 text-sm font-normal text-gray-100 dark:text-gray-600 break-words border-b border-gray-400 dark:border-gray-600 ${
              message.payload.type !== "waypoint" ? "rounded-b-lg" : ""
            }`}
          >
            {getPacketDisplayText(message.payload)}
          </p>
          {message.payload.type === "waypoint" && (
            <div className="relative">
              <Map
                style={{
                  width: "100%",
                  height: "210px",
                  borderRadius: "0px 0px 8px 8px",
                }}
                id={getWaypointMapId(message.payload.data.id)}
                mapStyle={style}
                interactive={false}
                initialViewState={{
                  latitude: message.payload.data.latitude,
                  longitude: message.payload.data.longitude,
                  zoom: 12,
                }}
                attributionControl={false}
              >
                <MeshWaypoint waypoint={message.payload.data} isSelected />

                <ScaleControl
                  maxWidth={144}
                  unit="imperial"
                  position="bottom-right"
                />

                <MapOverlayButton
                  className="absolute top-9 right-9"
                  onClick={handleShowOnMapClick}
                  tooltipText="Show on map"
                  tooltipProps={{ side: "left" }}
                >
                  <MapIcon
                    className="text-gray-400 dark:text-gray-300"
                    strokeWidth={1.5}
                  />
                </MapOverlayButton>
              </Map>
            </div>
          )}
        </div>

        <p
          className={`ml-auto mt-1 text-xs text-right ${
            isError
              ? "font-semibold text-red-500 dark:text-red-400"
              : "font-normal text-gray-500 dark:text-gray-400"
          }`}
        >
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <p className="flex flex-row justify-start mb-1 gap-2 items-baseline">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {usernameDisplayText}
        </span>
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-400">
          {formatMessageTime(packet.rxTime)}
        </span>
      </p>

      <div
        className={`mr-auto ${
          type === "waypoint" ? "w-2/5" : "w-fit"
        } max-w-[40%] rounded-r-lg rounded-bl-lg border border-gray-200 dark:border-gray-600`}
      >
        <p
          className={`px-3 py-2 rounded-tr-lg bg-white dark:bg-gray-800 text-sm font-normal text-gray-600 dark:text-gray-300 break-words border-b border-gray-100 dark:border-gray-700 ${
            message.payload.type !== "waypoint" ? "rounded-b-lg" : ""
          }`}
        >
          {getPacketDisplayText(message.payload)}
        </p>
        {message.payload.type === "waypoint" && (
          <div className="relative">
            <Map
              style={{
                width: "100%",
                height: "210px",
                borderRadius: "0px 0px 8px 8px",
              }}
              id={getWaypointMapId(message.payload.data.id)}
              mapLib={maplibregl}
              mapStyle={style}
              interactive={false}
              initialViewState={{
                latitude: message.payload.data.latitude,
                longitude: message.payload.data.longitude,
                zoom: 12,
              }}
              attributionControl={false}
            >
              <MeshWaypoint waypoint={message.payload.data} isSelected />

              <ScaleControl
                maxWidth={144}
                unit="imperial"
                position="bottom-right"
              />

              <MapOverlayButton
                className="absolute top-9 right-9"
                onClick={handleShowOnMapClick}
                tooltipText="Show on map"
                tooltipProps={{ side: "left" }}
              >
                <MapIcon className="text-gray-400" strokeWidth={1.5} />
              </MapOverlayButton>
            </Map>
          </div>
        )}
      </div>
    </div>
  );
};
