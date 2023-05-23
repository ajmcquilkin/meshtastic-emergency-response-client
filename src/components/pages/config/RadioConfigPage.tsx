import React, { useLayoutEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { ArrowDownToLine, Upload } from "lucide-react";

import type { app_protobufs_LocalConfig } from "@app/bindings";

import ConfigIcon from "@components/config/ConfigIcon";
import ConfigLayout from "@components/config/ConfigLayout";
import ConfigOption from "@components/config/ConfigOption";

import BluetoothConfigPage from "@components/config/device/BluetoothConfigPage";
import DeviceConfigPage from "@components/config/device/DeviceConfigPage";
import DisplayConfigPage from "@components/config/device/DisplayConfigPage";
import LoRaConfigPage from "@components/config/device/LoRaConfigPage";
import NetworkConfigPage from "@components/config/device/NetworkConfigPage";
import PositionConfigPage from "@components/config/device/PositionConfigPage";
import PowerConfigPage from "@components/config/device/PowerConfigPage";
// import UserConfigPage from "@components/config/device/UserConfigPage";

import {
  selectCurrentRadioConfig,
  selectEditedRadioConfig,
} from "@features/config/configSelectors";
import {
  requestSaveConfigToFile,
  requestUploadConfigToDevice,
} from "@features/config/configActions";
import type { IRadioConfigState } from "@features/config/configSlice";

export const RadioConfigOptions: Record<keyof IRadioConfigState, string> = {
  bluetooth: "Bluetooth",
  device: "Device",
  display: "Display",
  lora: "LoRa",
  network: "Network",
  position: "Position",
  power: "Power",
  // user: "User",
};

const switchActiveDetailView = (activeOption: keyof IRadioConfigState) => {
  switch (activeOption) {
    case "bluetooth":
      return <BluetoothConfigPage />;
    case "device":
      return <DeviceConfigPage />;
    case "display":
      return <DisplayConfigPage />;
    case "lora":
      return <LoRaConfigPage />;
    case "network":
      return <NetworkConfigPage />;
    case "position":
      return <PositionConfigPage />;
    case "power":
      return <PowerConfigPage />;
    // case "user":
    //   return <UserConfigPage />;
    default:
      return (
        <p className="m-auto text-base font-normal text-gray-700">
          Unknown option selected
        </p>
      );
  }
};

const getNumberOfPendingChanges = (
  currentRadioConfig: app_protobufs_LocalConfig | null,
  editedRadioConfig: IRadioConfigState,
  configKey: keyof IRadioConfigState
): number => {
  if (!currentRadioConfig) return -1;

  return Object.entries(editedRadioConfig?.[configKey] ?? {}).reduce(
    (accum, [editedConfigKey, editedConfigValue]) => {
      if (editedConfigValue == undefined) return accum; // ! Need to allow falsy values

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const currentFieldValue =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        (currentRadioConfig as Record<string, any>)?.[configKey]?.[
          editedConfigKey
        ] ?? null;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const editedFieldValue =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (editedRadioConfig?.[configKey] as Record<string, any>)?.[
          editedConfigKey
        ] ?? null;

      if (
        // Need [] === [] to be true
        JSON.stringify(currentFieldValue) !== JSON.stringify(editedFieldValue)
      ) {
        return accum + 1;
      }

      return accum;
    },
    0
  );
};

const RadioConfigPage = () => {
  const dispatch = useDispatch();

  const currentRadioConfig = useSelector(selectCurrentRadioConfig());
  const editedRadioConfig = useSelector(selectEditedRadioConfig());

  const { configKey } = useParams();

  const [activeOption, setActiveOption] =
    useState<keyof IRadioConfigState>("bluetooth");

  useLayoutEffect(() => {
    if (!configKey) return;
    setActiveOption(configKey as keyof IRadioConfigState);
  }, [configKey]);

  return (
    <div className="flex-1">
      <ConfigLayout
        title="Radio"
        backtrace={["Radio Configuration"]}
        renderIcons={(buttonClassName, iconClassName) => (
          <>
            <ConfigIcon
              onClick={() => dispatch(requestSaveConfigToFile(["radio"]))}
              tooltipText="Save radio configuration to file"
              buttonClassName={buttonClassName}
            >
              <ArrowDownToLine
                strokeWidth={1.5}
                className={`${iconClassName}`}
              />
            </ConfigIcon>
            <ConfigIcon
              onClick={() => dispatch(requestUploadConfigToDevice(["radio"]))}
              tooltipText="Upload radio configuration to device"
              buttonClassName={buttonClassName}
            >
              <Upload strokeWidth={1.5} className={`${iconClassName}`} />
            </ConfigIcon>
          </>
        )}
        renderOptions={() =>
          Object.entries(RadioConfigOptions).map(([k, displayName]) => {
            // * This is a limitation of Object.entries typing
            const configKey = k as keyof IRadioConfigState;

            const pendingChanges = getNumberOfPendingChanges(
              currentRadioConfig,
              editedRadioConfig,
              configKey
            );

            return (
              <ConfigOption
                key={configKey}
                title={displayName}
                subtitle={`${pendingChanges} pending changes`}
                isActive={activeOption === configKey}
                onClick={() => setActiveOption(configKey)}
              />
            );
          })
        }
      >
        <div className="flex flex-col justify-center align-middle w-full h-full bg-gray-100">
          {switchActiveDetailView(activeOption)}
        </div>
      </ConfigLayout>
    </div>
  );
};

export default RadioConfigPage;
