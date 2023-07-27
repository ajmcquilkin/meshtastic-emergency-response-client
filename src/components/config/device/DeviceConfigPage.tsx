import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useForm, DeepPartial } from "react-hook-form";
import { RotateCcw } from "lucide-react";

import debounce from "lodash.debounce";

import ConfigTitlebar from "@components/config/ConfigTitlebar";
import ConfigInput from "@components/config/ConfigInput";
import ConfigSelect from "@components/config/ConfigSelect";

import {
  DeviceConfigInput,
  configSliceActions,
} from "@features/config/configSlice";
import {
  selectCurrentRadioConfig,
  selectEditedRadioConfig,
} from "@features/config/configSelectors";

import { selectDevice } from "@features/device/deviceSelectors";
import { getDefaultConfigInput } from "@utils/form";

export interface IDeviceConfigPageProps {
  className?: string;
}

// See https://github.com/react-hook-form/react-hook-form/issues/10378
const parseDeviceConfigInput = (
  d: DeepPartial<DeviceConfigInput>
): DeepPartial<DeviceConfigInput> => ({
  ...d,
  nodeInfoBroadcastSecs: parseInt(d.nodeInfoBroadcastSecs as unknown as string),
  role: parseInt(d.role as unknown as string),
  rebroadcastMode: parseInt(d.rebroadcastMode as unknown as string),
});

const DeviceConfigPage = ({ className = "" }: IDeviceConfigPageProps) => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const device = useSelector(selectDevice());

  const currentConfig = useSelector(selectCurrentRadioConfig());
  const editedConfig = useSelector(selectEditedRadioConfig());

  const defaultValues = useMemo(
    () =>
      getDefaultConfigInput(
        device?.config.device ?? undefined,
        editedConfig.device ?? undefined
      ),
    []
  );

  const {
    register,
    reset,
    watch,
    formState: { errors },
  } = useForm<DeviceConfigInput>({
    defaultValues,
  });

  const updateConfigHander = useMemo(
    () =>
      debounce(
        (d: DeepPartial<DeviceConfigInput>) => {
          const data = parseDeviceConfigInput(d);
          dispatch(configSliceActions.updateRadioConfig({ device: data }));
        },
        500,
        { leading: true }
      ),
    []
  );

  useEffect(() => {
    return () => updateConfigHander.cancel();
  }, []);

  watch(updateConfigHander);

  const handleFormReset = () => {
    if (!currentConfig?.device) return;
    reset(currentConfig.device);
    dispatch(configSliceActions.updateRadioConfig({ device: null }));
  };

  return (
    <div className={`${className} flex-1 h-screen`}>
      <ConfigTitlebar
        title={t("config.radio.device.title")}
        subtitle={t("config.radio.device.description")}
        renderIcon={(c) => <RotateCcw className={c} />}
        buttonTooltipText={t("config.discardChanges")}
        onIconClick={handleFormReset}
      >
        <div className="flex flex-col gap-6">
          <ConfigSelect
            text={t("config.radio.device.deviceRole.title")}
            {...register("role")}
          >
            <option value="0">
              {t("config.radio.device.deviceRole.client")}
            </option>
            <option value="1">
              {t("config.radio.device.deviceRole.clientMuted")}
            </option>
            <option value="2">
              {t("config.radio.device.deviceRole.router")}
            </option>
            <option value="3">
              {t("config.radio.device.deviceRole.routerClient")}
            </option>
            <option value="4">
              {t("config.radio.device.deviceRole.repeater")}
            </option>
            <option value="5">
              {t("config.radio.device.deviceRole.tracker")}
            </option>
            <option value="6">
              {t("config.radio.device.deviceRole.sensor")}
            </option>
          </ConfigSelect>

          <ConfigInput
            type="checkbox"
            text={t("config.radio.device.serialEnabled")}
            error={errors.serialEnabled?.message}
            {...register("serialEnabled")}
          />

          <ConfigInput
            type="checkbox"
            text={t("config.radio.device.serialDebugEnabled")}
            error={errors.debugLogEnabled?.message}
            {...register("debugLogEnabled")}
          />

          {/* TODO BUTTON GPIO */}
          {/* TODO BUZZER GPIO */}

          <ConfigSelect
            text={t("config.radio.device.rebroadcastMode.title")}
            {...register("rebroadcastMode")}
          >
            <option value="0">
              {t("config.radio.device.rebroadcastMode.all")}
            </option>
            <option value="1">
              {t("config.radio.device.rebroadcastMode.allSkipDecoding")}
            </option>
            <option value="2">
              {t("config.radio.device.rebroadcastMode.localOnly")}
            </option>
          </ConfigSelect>

          <ConfigInput
            type="number"
            text={t("config.radio.device.nodeInfoBroadcastInterval")}
            error={errors.nodeInfoBroadcastSecs?.message}
            {...register("nodeInfoBroadcastSecs")}
          />

          <ConfigInput
            type="checkbox"
            text={t("config.radio.device.doubleTapButtonPress")}
            error={errors.doubleTapAsButtonPress?.message}
            {...register("doubleTapAsButtonPress")}
          />
        </div>
      </ConfigTitlebar>
    </div>
  );
};

export default DeviceConfigPage;
