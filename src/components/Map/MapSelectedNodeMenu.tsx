import {
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Copy,
  MapPin,
  PlugZap,
  X,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import TimeAgo from "timeago-react";

import { i18next } from "@app/i18n";

import { selectActiveNode } from "@features/ui/selectors";
import { uiSliceActions } from "@features/ui/slice";

import { writeValueToClipboard } from "@utils/clipboard";
import { useComponentReload } from "@utils/hooks";
import { formatLocation } from "@utils/map";
import { getLastHeardTime } from "@utils/nodes";

export interface IBatteryLevelIconProps {
  batteryLevel: number | null;
  className?: string;
}

const BatteryLevelIcon = ({
  batteryLevel,
  className = "",
}: IBatteryLevelIconProps) => {
  // No info
  if (!batteryLevel) return <Battery strokeWidth={1.5} className={className} />;

  // Plugged in
  if (batteryLevel > 100)
    return <PlugZap strokeWidth={1.5} className={className} />;

  if (batteryLevel > 75)
    return <BatteryFull strokeWidth={1.5} className={className} />;

  if (batteryLevel > 50)
    return <BatteryMedium strokeWidth={1.5} className={className} />;

  if (batteryLevel > 25)
    return <BatteryLow strokeWidth={1.5} className={className} />;

  return <BatteryWarning strokeWidth={1.5} className={className} />;
};

const getBatteryStateString = (batteryLevel: number | null) => {
  if (!batteryLevel) return i18next.t("map.panes.nodeInfo.battery.unknown");
  if (batteryLevel > 100)
    return i18next.t("map.panes.nodeInfo.battery.powered");
  return i18next.t("map.panes.nodeInfo.battery.discharging", { batteryLevel });
};

export const MapSelectedNodeMenu = () => {
  const { t, i18n } = useTranslation();

  useComponentReload(1000);

  const dispatch = useDispatch();
  const activeNode = useSelector(selectActiveNode());

  if (!activeNode) return <></>;

  const lastPacketTime = getLastHeardTime(activeNode);

  const deviceName = activeNode.user?.longName ?? t("general.notApplicable");
  const deviceLatCoord = activeNode.positionMetrics.at(-1)?.latitude ?? 0;
  const deviceLngCoord = activeNode.positionMetrics.at(-1)?.longitude ?? 0;
  const batteryLevel =
    activeNode.deviceMetrics.at(-1)?.metrics.batteryLevel ?? null;

  const clearActiveNode = () => {
    dispatch(uiSliceActions.setActiveNode(null));
  };

  return (
    <div className="absolute top-24 right-9 bg-white dark:bg-gray-800 p-5 pl-4 rounded-lg drop-shadow-lg w-80 z-[inherit]">
      <div className="flex justify-between">
        <h1 className="text-gray-600 dark:text-gray-400 text-2xl leading-5 font-semibold">
          {deviceName}
        </h1>
        <button type="button" onClick={clearActiveNode}>
          <X
            strokeWidth={1.5}
            className="w-5 h-5 text-gray-500 dark:text-gray-400"
          />
        </button>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm leading-5 font-normal pt-1">
        <Trans
          i18nKey="map.panes.nodeInfo.lastHeard"
          components={{
            timeAgo: lastPacketTime ? (
              <TimeAgo
                datetime={lastPacketTime * 1000}
                locale={i18n.language}
              />
            ) : (
              <>{t("map.panes.nodeInfo.unknownValue")}</>
            ),
          }}
        />
      </p>

      <h2 className="text-gray-500 dark:text-gray-400 text-base leading-6 font-semibold pt-2 pb-1">
        {t("map.panes.nodeInfo.generalInfo")}
      </h2>
      <div className="flex flex-col">
        <div className="flex justify-between pb-1">
          <div className="flex justify-start">
            <MapPin
              className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5"
              strokeWidth={1.5}
            />
            <h2 className="text-gray-500 dark:text-gray-400 text-base leading-6 font-normal pl-2">
              {!(deviceLatCoord && deviceLngCoord) ? (
                <span>{t("map.panes.nodeInfo.unknownValue")}</span>
              ) : (
                <span>
                  {`${formatLocation(deviceLatCoord)}, ${formatLocation(
                    deviceLngCoord,
                  )}`}
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              writeValueToClipboard(
                `${formatLocation(deviceLatCoord)}, ${formatLocation(
                  deviceLngCoord,
                )}`,
              )
            }
          >
            <Copy
              strokeWidth={1.5}
              className="w-5 h-5 float-right text-gray-500 dark:text-gray-400"
            />
          </button>
        </div>

        <div className="flex justify-between pb-1">
          <div className="flex justify-start">
            <BatteryLevelIcon
              batteryLevel={batteryLevel}
              className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5"
            />
            <h2 className="text-gray-500 dark:text-gray-400 text-base leading-6 font-normal pl-2">
              {getBatteryStateString(batteryLevel)}
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              writeValueToClipboard(getBatteryStateString(batteryLevel))
            }
          >
            <Copy
              strokeWidth={1.5}
              className="w-5 h-5 float-right text-gray-500 dark:text-gray-400"
            />
          </button>
        </div>

        {/* TODO add neighbors */}
      </div>
    </div>
  );
};
