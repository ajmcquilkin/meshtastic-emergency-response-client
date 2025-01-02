import { RotateCcw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { DeepPartial, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import debounce from "lodash.debounce";

import { ConfigInput } from "@components/config/ConfigInput";
import { ConfigSelect } from "@components/config/ConfigSelect";
import { ConfigTitlebar } from "@components/config/ConfigTitlebar";

import {
  selectCurrentRadioConfig,
  selectEditedRadioConfig,
} from "@features/config/selectors";
import { DeviceConfigInput, configSliceActions } from "@features/config/slice";

import { selectDevice } from "@features/device/selectors";
import { getDefaultConfigInput } from "@utils/form";

export interface IDeviceConfigPageProps {
  className?: string;
}

// See https://github.com/react-hook-form/react-hook-form/issues/10378
const parseDeviceConfigInput = (
  d: DeepPartial<DeviceConfigInput>,
): DeepPartial<DeviceConfigInput> => ({
  ...d,
  nodeInfoBroadcastSecs: parseInt(d.nodeInfoBroadcastSecs as unknown as string),
  role: parseInt(d.role as unknown as string),
  rebroadcastMode: parseInt(d.rebroadcastMode as unknown as string),
});

export const DeviceConfigPage = ({
  className = "",
}: IDeviceConfigPageProps) => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const device = useSelector(selectDevice());

  const currentConfig = useSelector(selectCurrentRadioConfig());
  const editedConfig = useSelector(selectEditedRadioConfig());

  const defaultValues = useMemo(
    () =>
      getDefaultConfigInput(
        device?.config.device ?? undefined,
        editedConfig.device ?? undefined,
      ),
    [device, editedConfig],
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
        { leading: true },
      ),
    [dispatch],
  );

  watch(updateConfigHander);

  // Cancel handlers when unmounting
  useEffect(() => {
    return () => updateConfigHander.cancel();
  }, [updateConfigHander]);

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
            <option value="4">
              {t("config.radio.device.deviceRole.repeater")}
            </option>
            <option value="5">
              {t("config.radio.device.deviceRole.tracker")}
            </option>
            <option value="6">
              {t("config.radio.device.deviceRole.sensor")}
            </option>
            <option value="7">{t("config.radio.device.deviceRole.tak")}</option>
            <option value="8">
              {t("config.radio.device.deviceRole.clientHidden")}
            </option>
            <option value="9">
              {t("config.radio.device.deviceRole.lostFound")}
            </option>
            <option value="10">
              {t("config.radio.device.deviceRole.takTracker")}
            </option>
            <option value="11">
              {t("config.radio.device.deviceRole.routerLate")}
            </option>
          </ConfigSelect>

          <ConfigInput
            type="checkbox"
            text={t("config.radio.device.serialEnabled")}
            error={errors.serialEnabled?.message as string}
            {...register("serialEnabled")}
          />

          <ConfigInput
            type="checkbox"
            text={t("config.radio.device.serialDebugEnabled")}
            error={errors.debugLogEnabled?.message as string}
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
            error={errors.nodeInfoBroadcastSecs?.message as string}
            {...register("nodeInfoBroadcastSecs")}
          />

          <ConfigInput
            type="checkbox"
            text={t("config.radio.device.doubleTapButtonPress")}
            error={errors.doubleTapAsButtonPress?.message as string}
            {...register("doubleTapAsButtonPress")}
          />
        </div>
      </ConfigTitlebar>
    </div>
  );
};
