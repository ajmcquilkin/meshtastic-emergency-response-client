import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import * as Popover from "@radix-ui/react-popover";
import * as Select from "@radix-ui/react-select";
import debounce from "lodash.debounce";
import { Locate, Plus, X } from "lucide-react";
import moment from "moment";
import { ChangeEventHandler, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LngLat,
  // biome-ignore lint/suspicious/noShadowRestrictedNames: Need named export
  Map,
  MarkerDragEvent,
  NavigationControl,
  ScaleControl,
  useMap,
} from "react-map-gl/maplibre";
import { useDispatch, useSelector } from "react-redux";
import { warn } from "tauri-plugin-log-api";

import type { app_device_NormalizedWaypoint } from "@bindings/index";

import { MapOverlayButton } from "@components/Map/MapOverlayButton";
import { MeshWaypoint } from "@components/Waypoints/MeshWaypoint";
import { ConnectionInput } from "@components/connection/ConnectionInput";
import { ConnectionSwitch } from "@components/connection/ConnectionSwitch";

import { selectMapConfigState } from "@features/appConfig/selectors";
import { useDeviceApi } from "@features/device/api";
import {
  selectDevice,
  selectDeviceChannels,
  selectPrimaryDeviceKey,
} from "@features/device/selectors";

import { dateTimeLocalFormatString } from "@utils/form";
import { useIsDarkMode } from "@utils/hooks";
import { MapIDs, formatLocation, getFlyToConfig } from "@utils/map";
import { getChannelName } from "@utils/messaging";

import "@components/Map/MapView.css";

const WAYPOINT_NAME_MAX_LEN = 30;
const WAYPOINT_DESC_MAX_LEN = 100;

// TODO follow this: https://github.com/missive/emoji-mart/issues/576
export type Emoji = {
  id: string;
  native: string;
  shortcodes: string;
  keywords: string[];
  unified: string;
};

export interface ICreateWaypointDialogProps {
  lngLat: LngLat;
  closeDialog: () => void;
  existingWaypoint?: app_device_NormalizedWaypoint | null;
}

// Needs to be rendered within a MapProvider component
export const CreateWaypointDialog = ({
  lngLat,
  closeDialog,
  existingWaypoint,
}: ICreateWaypointDialogProps) => {
  const { t } = useTranslation();

  const { isDarkMode } = useIsDarkMode();

  const dispatch = useDispatch();
  const primaryDeviceKey = useSelector(selectPrimaryDeviceKey());
  const deviceChannels = useSelector(selectDeviceChannels());
  const { style } = useSelector(selectMapConfigState());
  const device = useSelector(selectDevice());

  const deviceApi = useDeviceApi();

  const { [MapIDs.CreateWaypointDialog]: map } = useMap();

  const [name, setName] = useState<{ value: string; isValid: boolean }>(
    existingWaypoint
      ? { value: existingWaypoint.name, isValid: true }
      : {
          value: "",
          isValid: true,
        },
  );

  const [desc, setDesc] = useState<{
    value: string;
    isValid: boolean;
  }>(
    existingWaypoint
      ? { value: existingWaypoint.description, isValid: true }
      : { value: "", isValid: true },
  );

  const [waypointPosition, setWaypointPosition] = useState<LngLat>(
    existingWaypoint
      ? ({
          lng: existingWaypoint.longitude,
          lat: existingWaypoint.latitude,
        } as LngLat)
      : lngLat,
  );

  const [waypointLocked, setWaypointLocked] = useState<boolean>(
    existingWaypoint ? existingWaypoint.lockedTo !== 0 : false,
  );

  const [waypointExpires, setWaypointExpires] = useState<boolean>(
    existingWaypoint ? existingWaypoint.expire !== 0 : false,
  );

  const [expireTime, setExpireTime] = useState<string>(
    existingWaypoint
      ? moment(existingWaypoint.expire * 1000).format(dateTimeLocalFormatString)
      : moment().add(1, "years").format(dateTimeLocalFormatString),
  );

  const [emoji, setEmoji] = useState<string | null>(
    existingWaypoint ? String.fromCodePoint(existingWaypoint.icon) : null,
  );

  const [channelNum, setChannelNum] = useState(0);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);

  const handleNameChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const { value } = e.target;
    const isValid = value.length <= WAYPOINT_NAME_MAX_LEN;
    setName({ value, isValid });

    if (!isValid && nameRef.current) {
      nameRef.current.setCustomValidity(
        t("map.waypoints.nameTooLong", {
          currentLength: value.length,
          maxLength: WAYPOINT_NAME_MAX_LEN,
        }),
      );
    }

    if (isValid && nameRef.current) {
      nameRef.current.setCustomValidity(""); // Make input valid
    }
  };

  const handleDescChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const { value } = e.target;
    const isValid = value.length <= WAYPOINT_DESC_MAX_LEN;
    setDesc({ value, isValid });

    if (!isValid && descRef.current) {
      descRef.current.setCustomValidity(
        t("map.waypoints.descriptionTooLong", {
          currentLength: value.length,
          maxLength: WAYPOINT_DESC_MAX_LEN,
        }),
      );
    }

    if (isValid && descRef.current) {
      descRef.current.setCustomValidity(""); // Make input valid
    }
  };

  const flyToPosition = useMemo(
    () => (pos: LngLat) => map?.flyTo(getFlyToConfig(pos)),
    [map],
  );

  const handlePositionUpdate = useMemo(
    () =>
      debounce<(e: MarkerDragEvent) => void>((e) => {
        setWaypointPosition(e.lngLat as LngLat);
        flyToPosition(e.lngLat as LngLat);
      }, 300),
    [flyToPosition],
  );

  const encodeEmoji = (emoji: string | null): number => {
    if (!emoji) return 0; // Catches null or empty string

    const emojiUnicodeString = (emoji.codePointAt(0) ?? 0).toString(16);
    return parseInt(emojiUnicodeString, 16);
  };

  const handleUpdateExpireTime: ChangeEventHandler<HTMLInputElement> = (e) => {
    const { value } = e.target;

    // Don't reset expire time if the user clears the input
    // Disable waypoint expiring to prevent empty input state
    if (!value) {
      setWaypointExpires(false);
      return;
    }

    setExpireTime(value);
  };

  const handleSubmit = () => {
    // Take the emoji and convert it to a base 10 number (unicode bytes)
    const encodedEmoji = encodeEmoji(emoji);

    const createdWaypoint: app_device_NormalizedWaypoint = {
      id: existingWaypoint?.id ?? 0,
      latitude: waypointPosition.lat,
      longitude: waypointPosition.lng,
      name: name.value,
      description: desc.value,
      expire: waypointExpires ? moment(expireTime).valueOf() / 1000 : 0, // secs since epoch
      lockedTo: waypointLocked ? device?.myNodeInfo.myNodeNum ?? 0 : 0,
      icon: encodedEmoji,
    };

    if (!primaryDeviceKey) {
      warn("No primary device key port, not creating waypoint");
      return;
    }

    deviceApi.sendWaypoint({
      deviceKey: primaryDeviceKey,
      waypoint: createdWaypoint,
      channel: channelNum,
    });

    closeDialog();
  };

  return (
    <Dialog.Portal>
      {/* Tracking https://github.com/radix-ui/primitives/issues/1159 */}
      <div className="fixed inset-0 bg-gray-900/[0.4] dark:bg-gray-600/[0.7]" />
      <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col bg-white dark:bg-gray-800 default-overlay">
        <div className="flex flex-row max-h-[80vh]">
          <div className="relative w-[600px]">
            <Map
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                borderRadius: "8px 0px 0px 8px",
              }}
              id={MapIDs.CreateWaypointDialog}
              mapStyle={style}
              initialViewState={{
                latitude: waypointPosition.lat,
                longitude: waypointPosition.lng,
                zoom: 12,
              }}
              attributionControl={false}
            >
              <MeshWaypoint
                waypoint={{
                  name: name.value,
                  description: desc.value,
                  expire: moment(expireTime).valueOf() / 1000,
                  icon: encodeEmoji(emoji),
                  id: existingWaypoint?.id ?? 0,
                  latitude: waypointPosition.lat,
                  longitude: waypointPosition.lng,
                  lockedTo: waypointLocked
                    ? device?.myNodeInfo.myNodeNum ?? 0
                    : 0,
                }}
                isSelected
                draggable
                onDragEnd={handlePositionUpdate}
              />

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

              <MapOverlayButton
                className="absolute top-9 right-9"
                onClick={() => flyToPosition(waypointPosition)}
                tooltipText={t("map.waypoints.centerWaypointTooltip")}
                tooltipProps={{ side: "left" }}
              >
                <Locate
                  strokeWidth={1}
                  className="text-gray-600 dark:text-gray-400"
                />
              </MapOverlayButton>
            </Map>
            <div className=" w-[480px] h-full" />
          </div>

          <div className="flex flex-col gap-4 px-9 py-7 w-96">
            <div className="flex flex-col">
              <Dialog.Title className="text-base font-medium text-gray-700 dark:text-gray-300">
                {existingWaypoint
                  ? t("map.waypoints.editWaypointTitle")
                  : t("map.waypoints.createWaypointTitle")}
              </Dialog.Title>

              <Dialog.Description className="text-sm font-normal text-gray-500">
                {`${formatLocation(waypointPosition.lat)}, ${formatLocation(
                  waypointPosition.lng,
                )}`}
              </Dialog.Description>
            </div>

            <div className="flex flex-col gap-4 overflow-auto hide-scrollbar">
              <fieldset className="">
                <label className="flex flex-col flex-1">
                  <p
                    className={`flex flex-row justify-between ${
                      name.isValid
                        ? "text-gray-600 dark:text-gray-400"
                        : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    <span>{t("map.waypoints.nameLabel")}</span>
                    <span>
                      ({name.value.length}/{WAYPOINT_NAME_MAX_LEN})
                    </span>
                  </p>

                  <ConnectionInput
                    className="w-full invalid:border-red-400 dark:invalid:border-red-400 invalid:text-red-400 dark:invalid:text-red-400"
                    placeholder={t("map.waypoints.namePlaceholder")}
                    value={name.value}
                    onChange={handleNameChange}
                    ref={nameRef}
                  />
                </label>
              </fieldset>

              <fieldset className="">
                <label className="flex flex-col flex-1">
                  <p
                    className={`flex flex-row justify-between ${
                      desc.isValid
                        ? "text-gray-600 dark:text-gray-400"
                        : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    <span>{t("map.waypoints.descriptionLabel")}</span>
                    <span>
                      ({desc.value.length}/{WAYPOINT_DESC_MAX_LEN})
                    </span>
                  </p>

                  <ConnectionInput
                    className="w-full invalid:border-red-400 dark:invalid:border-red-400 invalid:text-red-400 dark:invalid:text-red-400"
                    placeholder={t("map.waypoints.descriptionPlaceholder")}
                    value={desc.value}
                    onChange={handleDescChange}
                    ref={descRef}
                  />
                </label>
              </fieldset>

              <fieldset className="">
                <label className="text-gray-600 dark:text-gray-400">
                  <p>{t("map.waypoints.blockWaypointEditing")}</p>
                  <ConnectionSwitch
                    checked={waypointLocked}
                    setChecked={setWaypointLocked}
                  />
                </label>
              </fieldset>

              <fieldset className="">
                <label className="text-gray-600 dark:text-gray-400">
                  <p>{t("map.waypoints.waypointExpires")}</p>
                  <ConnectionSwitch
                    checked={waypointExpires}
                    setChecked={setWaypointExpires}
                  />
                </label>
              </fieldset>

              <fieldset className="">
                <label className="">
                  <p className="text-gray-600 dark:text-gray-400">
                    {t("map.waypoints.expireTime")}
                  </p>
                  <ConnectionInput
                    className="w-full disabled:cursor-not-allowed disabled:text-gray-300 dark:disabled:text-gray-700"
                    type="datetime-local"
                    disabled={!waypointExpires}
                    min={moment().format(dateTimeLocalFormatString)}
                    value={expireTime}
                    onChange={handleUpdateExpireTime}
                  />
                </label>
              </fieldset>

              <fieldset className="">
                <label className="">
                  <p className="text-gray-600 dark:text-gray-400">
                    {t("map.waypoints.deviceChannel")}
                  </p>
                  <Select.Root
                    value={`${channelNum}`}
                    onValueChange={(e) => setChannelNum(parseInt(e))}
                  >
                    <Select.Trigger
                      className="flex-1 border px-5 py-4 border-gray-400 rounded-lg text-gray-700 dark:text-gray-400 h-full bg-transparent focus:outline-none disabled:cursor-wait inline-flex items-center justify-center"
                      aria-label={t("map.waypoints.channelAriaLabel")}
                      asChild
                    >
                      <button type="button">
                        <Select.Value
                          placeholder={t("map.waypoints.channelPlaceholder")}
                          defaultValue={0}
                        />
                        <Select.Icon className="ml-2">
                          <ChevronDownIcon />
                        </Select.Icon>
                      </button>
                    </Select.Trigger>

                    <Select.Portal>
                      <Select.Content className="">
                        <Select.ScrollUpButton className="flex items-center justify-center h-6">
                          <ChevronUpIcon />
                        </Select.ScrollUpButton>

                        <Select.Viewport className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg">
                          <Select.Group>
                            {deviceChannels.map((c) => (
                              <Select.Item
                                key={c.config.index}
                                value={`${c.config.index}`}
                                className={
                                  "relative flex items-center select-none h-6 pl-7 pr-5 py-4 text-gray-700 dark:text-gray-300 cursor-pointer radix-disabled:cursor-default radix-disabled:opacity-50 dark:radix-disabled:opacity-100 dark:radix-disabled:text-gray-700"
                                }
                                disabled={c.config.role === 0} // DISABLED role
                              >
                                <Select.ItemText>
                                  {getChannelName(c)}
                                </Select.ItemText>
                                <Select.ItemIndicator className="absolute left-0 w-6 inline-flex items-center justify-center">
                                  <CheckIcon />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Group>
                        </Select.Viewport>

                        <Select.ScrollDownButton className="flex items-center justify-center h-6">
                          <ChevronDownIcon />
                        </Select.ScrollDownButton>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </label>
              </fieldset>

              <div className="mb-2">
                <p className="text-gray-600 dark:text-gray-400">
                  {t("map.waypoints.pinEmoji")}
                </p>
                <Popover.Root
                  open={isEmojiPickerOpen}
                  onOpenChange={(e) => setIsEmojiPickerOpen(e)}
                >
                  <div className="flex flex-row">
                    <Popover.Trigger asChild>
                      <div className="relative mr-auto">
                        <button
                          type="button"
                          className="relative w-9 h-9 flex align-middle justify-center border border-gray-200 dark:border-gray-500 rounded-full"
                          aria-label="Select emoji"
                        >
                          <p className="m-auto text-xl">
                            {emoji ?? (
                              <Plus
                                strokeWidth={1.5}
                                className="text-gray-400 dark:text-gray-500 p-0.5"
                              />
                            )}
                          </p>
                        </button>

                        {emoji && (
                          <button
                            type="button"
                            className="absolute -bottom-1 -right-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmoji(null);
                            }}
                          >
                            <Cross2Icon className="w-4 h-4 p-0.5 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-500 text-gray-400 dark:text-gray-400" />
                          </button>
                        )}
                      </div>
                    </Popover.Trigger>
                  </div>

                  <Popover.Portal>
                    <Popover.Content className="" side="bottom" sideOffset={5}>
                      <div className="relative z-50">
                        {/* Not sure if picker can be translated, this doesn't make sense to me https://github.com/missive/emoji-mart#-internationalization */}
                        <Picker
                          data={data}
                          onEmojiSelect={(e: Emoji) => {
                            setEmoji(e.native);
                            setIsEmojiPickerOpen(false);
                          }}
                          theme={isDarkMode ? "dark" : "light"}
                          previewPosition="none"
                        />
                        <Popover.Arrow className="fill-gray-200 dark:fill-gray-800" />
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </div>
            </div>

            <div className="flex flex-row gap-6 justify-end mt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!(name.isValid && desc.isValid)}
                className=" text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:text-gray-300 dark:disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
              >
                {existingWaypoint
                  ? t("map.waypoints.saveChanges")
                  : t("map.waypoints.createWaypoint")}
              </button>

              <Dialog.Close asChild>
                <button
                  type="button"
                  className="text-red-400 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 transition-colors"
                >
                  {t("map.waypoints.cancel")}
                </button>
              </Dialog.Close>
            </div>
          </div>
        </div>

        <Dialog.Close asChild>
          <button
            type="button"
            className="fixed top-7 right-9 w-6 h-6 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={t("map.waypoints.closeAriaLabel")}
          >
            <X strokeWidth={1.5} />
          </button>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
};
