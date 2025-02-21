import { Copy, Lock, MapPin, Timer, TimerOff, Unlock, X } from "lucide-react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { warn } from "tauri-plugin-log-api";

import type { app_device_NormalizedWaypoint } from "@bindings/index";

import { useDeviceApi } from "@features/device/api";
import {
  selectAllUsersByNodeIds,
  selectDevice,
  selectPrimaryDeviceKey,
} from "@features/device/selectors";
import { selectActiveWaypoint } from "@features/ui/selectors";
import { uiSliceActions } from "@features/ui/slice";

import { writeValueToClipboard } from "@utils/clipboard";
import { formatLocation } from "@utils/map";
import { getWaypointTitle } from "@utils/messaging";

// This file contains the WaypointMenu component when it is not being edited
// It is called in MapView.tsx

export interface IWaypointMenuProps {
  editWaypoint: (waypoint: app_device_NormalizedWaypoint) => void;
}

export const WaypointMenu = ({ editWaypoint }: IWaypointMenuProps) => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const activeWaypoint = useSelector(selectActiveWaypoint());
  const primaryDeviceKey = useSelector(selectPrimaryDeviceKey());
  const device = useSelector(selectDevice());
  const usersMap = useSelector(selectAllUsersByNodeIds());

  const deviceApi = useDeviceApi();

  // Only show if there is an active waypoint
  if (!activeWaypoint) return null;

  const handleEditWaypoint = () => {
    if (!primaryDeviceKey) {
      warn("No primary device key set, cannot edit waypoint");
      return;
    }

    editWaypoint(activeWaypoint);
  };

  const handleDeleteWaypoint = () => {
    if (!primaryDeviceKey) {
      warn("No primary device key set, cannot delete waypoint");
      return;
    }

    deviceApi.deleteWaypoint({
      deviceKey: primaryDeviceKey,
      waypointId: activeWaypoint.id,
    });
  };

  const { description, latitude, longitude, expire, icon, lockedTo } =
    activeWaypoint;

  return (
    <div className="absolute top-24 right-9 bg-white dark:bg-gray-800 p-6 rounded-lg drop-shadow-lg w-96 z-[inherit]">
      <button
        className="absolute top-6 right-6"
        type="button"
        onClick={() => dispatch(uiSliceActions.setActiveWaypoint(null))}
      >
        <X
          strokeWidth={1.5}
          className="w-5 h-5 text-gray-500 dark:text-gray-400"
        />
      </button>

      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2">
          {!!icon && <p className="text-2xl">{String.fromCodePoint(icon)}</p>}
          <h1 className="mr-8 text-gray-600 dark:text-gray-300 leading-7 text-2xl font-semibold break-words">
            {getWaypointTitle(activeWaypoint)}
          </h1>
        </div>

        <div className="text-gray-500 dark:text-gray-400 text-base">
          <h2 className="leading-6 font-semibold pt-2">
            {t("map.panes.waypointInfo.description")}
          </h2>
          <h2 className="leading-5 font-normal py-1">
            {description || t("map.panes.waypointInfo.noDescription")}
          </h2>
        </div>

        <div>
          <h2 className="text-gray-500 dark:text-gray-400 text-base leading-6 font-semibold pt-2 pb-1">
            {t("map.panes.waypointInfo.details")}
          </h2>

          <div className="flex flex-col gap-1 pt-1">
            <div className="flex justify-between pb-1 text-gray-500 dark:text-gray-400">
              <div className="flex justify-start">
                {lockedTo ? (
                  <Lock strokeWidth={1.5} />
                ) : (
                  <Unlock strokeWidth={1.5} />
                )}
                <h2 className="text-base leading-6 font-normal pl-2">
                  {lockedTo === device?.myNodeInfo.myNodeNum
                    ? t("map.panes.waypointInfo.locked.onlyYouEdit")
                    : lockedTo !== 0
                      ? t("map.panes.waypointInfo.onlyNodeEdit", {
                          nodeName: usersMap[lockedTo]?.shortName || lockedTo,
                        })
                      : t("map.panes.waypointInfo.locked.anyoneEdit")}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  writeValueToClipboard(
                    lockedTo === device?.myNodeInfo.myNodeNum
                      ? t("map.panes.waypointInfo.locked.onlyYouEdit")
                      : lockedTo !== 0
                        ? t("map.panes.waypointInfo.onlyNodeEdit", {
                            nodeName: usersMap[lockedTo]?.shortName || lockedTo,
                          })
                        : t("map.panes.waypointInfo.anyoneEdit"),
                  )
                }
              >
                <Copy strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex justify-between pb-1 text-gray-500 dark:text-gray-400">
              <div className="flex justify-start">
                <MapPin strokeWidth={1.5} />
                <h2 className="text-base leading-6 font-normal pl-2">
                  {latitude && longitude
                    ? `(${formatLocation(latitude)}, ${formatLocation(
                        longitude,
                      )})`
                    : t("map.panes.waypointInfo.noLocationSet")}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  writeValueToClipboard(
                    latitude && longitude
                      ? `(${latitude}, ${longitude})`
                      : t("map.panes.waypointInfo.noLocationSet"),
                  )
                }
              >
                <Copy strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex justify-between pb-1 text-gray-500 dark:text-gray-400">
              <div className="flex justify-start">
                {!expire ? (
                  <TimerOff strokeWidth={1.5} />
                ) : (
                  <Timer strokeWidth={1.5} />
                )}
                <h2 className="text-base leading-6 font-normal pl-2">
                  {!expire
                    ? t("map.panes.waypointInfo.doesNotExpire")
                    : t("map.panes.waypointInfo.expires", {
                        fromNow: moment(expire * 1000).fromNow(),
                      })}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  writeValueToClipboard(
                    !expire
                      ? t("map.panes.waypointInfo.doesNotExpire")
                      : t("map.panes.waypointInfo.expires", {
                          fromNow: moment(expire * 1000).fromNow(),
                        }),
                  )
                }
              >
                <Copy strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-row gap-6 justify-end mt-4">
          <button
            type="button"
            onClick={handleEditWaypoint}
            disabled={!!lockedTo && lockedTo !== device?.myNodeInfo.myNodeNum}
            className=" text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {t("map.panes.waypointInfo.editWaypoint")}
          </button>

          <button
            type="button"
            onClick={handleDeleteWaypoint}
            className="text-red-400 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 transition-colors"
          >
            {t("map.panes.waypointInfo.deleteWaypoint")}
          </button>
        </div>
      </div>
    </div>
  );
};
