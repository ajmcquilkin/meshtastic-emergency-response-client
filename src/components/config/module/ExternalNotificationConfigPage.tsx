import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useForm, DeepPartial } from "react-hook-form";
import { RotateCcw } from "lucide-react";

import debounce from "lodash.debounce";

import ConfigTitlebar from "@components/config/ConfigTitlebar";
// import ConfigLabel from "@components/config/ConfigLabel";
import ConfigInput from "@components/config/ConfigInput";

import {
  ExternalNotificationModuleConfigInput,
  configSliceActions,
} from "@features/config/slice";
import {
  selectCurrentModuleConfig,
  selectEditedModuleConfig,
} from "@features/config/selectors";

import { selectDevice } from "@features/device/selectors";
import { getDefaultConfigInput } from "@utils/form";

export interface IExternalNotificationConfigPageProps {
  className?: string;
}

// See https://github.com/react-hook-form/react-hook-form/issues/10378
const parseExternalNotificationModuleConfigInput = (
  d: DeepPartial<ExternalNotificationModuleConfigInput>
): DeepPartial<ExternalNotificationModuleConfigInput> => ({
  ...d,
  outputMs: parseInt(d.outputMs as unknown as string),
  output: parseInt(d.output as unknown as string),
  outputVibra: parseInt(d.outputVibra as unknown as string),
  outputBuzzer: parseInt(d.outputBuzzer as unknown as string),
  nagTimeout: parseInt(d.nagTimeout as unknown as string),
});

const ExternalNotificationConfigPage = ({
  className = "",
}: IExternalNotificationConfigPageProps) => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const device = useSelector(selectDevice());

  const currentConfig = useSelector(selectCurrentModuleConfig());
  const editedConfig = useSelector(selectEditedModuleConfig());

  const [moduleDisabled, setModuleDisabled] = useState(
    !device?.moduleConfig.externalNotification?.enabled ?? true
  );

  const [bellAlertsDisabled, setBellAlertsDisabled] = useState(
    !device?.moduleConfig.externalNotification?.alertBell ?? true
  );

  const [messageAlertsDisabled, setMessageAlertsDisabled] = useState(
    !device?.moduleConfig.externalNotification?.alertMessage ?? true
  );

  const defaultValues = useMemo(
    () =>
      getDefaultConfigInput(
        device?.moduleConfig.externalNotification ?? undefined,
        editedConfig.externalNotification ?? undefined
      ),
    []
  );

  const updateStateFlags = (
    d: DeepPartial<ExternalNotificationModuleConfigInput>
  ) => {
    setModuleDisabled(!d.enabled);
    setBellAlertsDisabled(!d.alertBell);
    setMessageAlertsDisabled(!d.alertMessage);
  };

  useEffect(() => {
    if (!defaultValues) return;
    updateStateFlags(defaultValues);
  }, [defaultValues]);

  const {
    register,
    reset,
    watch,
    formState: { errors },
  } = useForm<ExternalNotificationModuleConfigInput>({
    defaultValues,
  });

  const updateConfigHander = useMemo(
    () =>
      debounce(
        (d: DeepPartial<ExternalNotificationModuleConfigInput>) => {
          const data = parseExternalNotificationModuleConfigInput(d);
          updateStateFlags(data);
          dispatch(
            configSliceActions.updateModuleConfig({
              externalNotification: data,
            })
          );
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
    if (!currentConfig?.externalNotification) return;
    reset(currentConfig.externalNotification);
    dispatch(
      configSliceActions.updateModuleConfig({ externalNotification: null })
    );
  };

  return (
    <div className={`${className} flex-1 h-screen`}>
      <ConfigTitlebar
        title={t("config.module.externalNotification.title")}
        subtitle={t("config.module.externalNotification.description")}
        renderIcon={(c) => <RotateCcw className={c} />}
        buttonTooltipText={t("config.discardChanges")}
        onIconClick={handleFormReset}
      >
        <div className="flex flex-col gap-6">
          <ConfigInput
            type="checkbox"
            text={t("config.module.externalNotification.extNotEnabled")}
            error={errors.enabled?.message}
            {...register("enabled")}
          />

          <ConfigInput
            type="checkbox"
            text={t("config.module.externalNotification.activeHighLed")}
            disabled={moduleDisabled}
            error={errors.active?.message}
            {...register("active")}
          />

          <ConfigInput
            type="checkbox"
            text={t("config.module.externalNotification.enableBellAlerts")}
            disabled={moduleDisabled}
            error={errors.alertBell?.message}
            {...register("alertBell")}
          />

          <ConfigInput
            type="checkbox"
            text={t(
              "config.module.externalNotification.enableBellVibrateAlert"
            )}
            disabled={moduleDisabled || bellAlertsDisabled}
            error={errors.alertBellVibra?.message}
            {...register("alertBellVibra")}
          />

          <ConfigInput
            type="checkbox"
            text={t("config.module.externalNotification.enableBellBuzzerAlert")}
            disabled={moduleDisabled || bellAlertsDisabled}
            error={errors.alertBellBuzzer?.message}
            {...register("alertBellBuzzer")}
          />

          <ConfigInput
            type="checkbox"
            text={t("config.module.externalNotification.enableMessageAlerts")}
            disabled={moduleDisabled}
            error={errors.alertMessage?.message}
            {...register("alertMessage")}
          />

          <ConfigInput
            type="checkbox"
            text={t(
              "config.module.externalNotification.enableMessageVibrateAlert"
            )}
            disabled={moduleDisabled || messageAlertsDisabled}
            error={errors.alertMessageVibra?.message}
            {...register("alertMessageVibra")}
          />

          <ConfigInput
            type="checkbox"
            text={t(
              "config.module.externalNotification.enableMessageBuzzerAlert"
            )}
            disabled={moduleDisabled || messageAlertsDisabled}
            error={errors.alertMessageBuzzer?.message}
            {...register("alertMessageBuzzer")}
          />

          <ConfigInput
            type="number"
            text={t("config.module.externalNotification.alertLedPin")}
            disabled={moduleDisabled}
            error={errors.output?.message}
            {...register("output")}
          />

          <ConfigInput
            type="number"
            text={t("config.module.externalNotification.alertVibratePin")}
            disabled={moduleDisabled}
            error={errors.outputVibra?.message}
            {...register("outputVibra")}
          />

          <ConfigInput
            type="number"
            text={t("config.module.externalNotification.alertBuzzerPin")}
            disabled={moduleDisabled}
            error={errors.outputBuzzer?.message}
            {...register("outputBuzzer")}
          />

          <ConfigInput
            type="checkbox"
            text={t("config.module.externalNotification.enableBuzzerPwm")}
            disabled={moduleDisabled}
            error={errors.usePwm?.message}
            {...register("usePwm")}
          />

          <ConfigInput
            type="number"
            text={t("config.module.externalNotification.alertDuration")}
            disabled={moduleDisabled}
            error={errors.outputMs?.message}
            {...register("outputMs")}
          />

          <ConfigInput
            type="number"
            text={t("config.module.externalNotification.alertNagDuration")}
            disabled={moduleDisabled}
            error={errors.nagTimeout?.message}
            {...register("nagTimeout")}
          />
        </div>
      </ConfigTitlebar>
    </div>
  );
};

export default ExternalNotificationConfigPage;
