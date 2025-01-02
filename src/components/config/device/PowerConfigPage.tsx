import { RotateCcw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { DeepPartial, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import debounce from "lodash.debounce";

// import ConfigLabel from "@components/config/ConfigLabel";
import { ConfigInput } from "@components/config/ConfigInput";
import { ConfigTitlebar } from "@components/config/ConfigTitlebar";

import {
  selectCurrentRadioConfig,
  selectEditedRadioConfig,
} from "@features/config/selectors";
import { PowerConfigInput, configSliceActions } from "@features/config/slice";

import { selectDevice } from "@features/device/selectors";
import { getDefaultConfigInput } from "@utils/form";

export interface IPowerConfigPageProps {
  className?: string;
}

// See https://github.com/react-hook-form/react-hook-form/issues/10378
const parsePowerConfigInput = (
  d: DeepPartial<PowerConfigInput>,
): DeepPartial<PowerConfigInput> => ({
  ...d,
  onBatteryShutdownAfterSecs: parseInt(
    d.onBatteryShutdownAfterSecs as unknown as string,
  ),
  adcMultiplierOverride: parseFloat(
    d.adcMultiplierOverride as unknown as string,
  ),
  waitBluetoothSecs: parseInt(d.waitBluetoothSecs as unknown as string),
  sdsSecs: parseInt(d.sdsSecs as unknown as string),
  lsSecs: parseInt(d.lsSecs as unknown as string),
  minWakeSecs: parseInt(d.minWakeSecs as unknown as string),
});

export const PowerConfigPage = ({ className = "" }: IPowerConfigPageProps) => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const device = useSelector(selectDevice());

  const currentConfig = useSelector(selectCurrentRadioConfig());
  const editedConfig = useSelector(selectEditedRadioConfig());

  const defaultValues = useMemo(
    () =>
      getDefaultConfigInput(
        device?.config.power ?? undefined,
        editedConfig.power ?? undefined,
      ),
    [device, editedConfig],
  );

  const {
    register,
    reset,
    watch,
    formState: { errors },
  } = useForm<PowerConfigInput>({
    defaultValues,
  });

  const updateConfigHander = useMemo(
    () =>
      debounce(
        (d: DeepPartial<PowerConfigInput>) => {
          const data = parsePowerConfigInput(d);
          dispatch(configSliceActions.updateRadioConfig({ power: data }));
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
    if (!currentConfig?.power) return;
    reset(currentConfig.power);
    dispatch(configSliceActions.updateRadioConfig({ power: null }));
  };

  return (
    <div className={`${className} flex-1 h-screen`}>
      <ConfigTitlebar
        title={t("config.radio.power.title")}
        subtitle={t("config.radio.power.description")}
        renderIcon={(c) => <RotateCcw className={c} />}
        buttonTooltipText={t("config.discardChanges")}
        onIconClick={handleFormReset}
      >
        <div className="flex flex-col gap-6">
          <ConfigInput
            type="switch"
            text={t("config.radio.power.enablePowerSaving")}
            error={errors.isPowerSaving?.message as string}
            {...register("isPowerSaving")}
          />

          <ConfigInput
            type="number"
            text={t("config.radio.power.shutdownPowerLoss")}
            error={errors.onBatteryShutdownAfterSecs?.message as string}
            {...register("onBatteryShutdownAfterSecs")}
          />

          <ConfigInput
            type="number"
            text={t("config.radio.power.adcMultOverride")}
            error={errors.adcMultiplierOverride?.message as string}
            {...register("adcMultiplierOverride")}
          />

          <ConfigInput
            type="number"
            text={t("config.radio.power.bluetoothTimeout")}
            error={errors.waitBluetoothSecs?.message as string}
            {...register("waitBluetoothSecs")}
          />

          <ConfigInput
            type="number"
            text={t("config.radio.power.sdsInterval")}
            error={errors.sdsSecs?.message as string}
            {...register("sdsSecs")}
          />

          <ConfigInput
            type="number"
            text={t("config.radio.power.lsInterval")}
            error={errors.lsSecs?.message as string}
            {...register("lsSecs")}
          />

          <ConfigInput
            type="number"
            text={t("config.radio.power.minWakeInterval")}
            error={errors.minWakeSecs?.message as string}
            {...register("minWakeSecs")}
          />
        </div>
      </ConfigTitlebar>
    </div>
  );
};
