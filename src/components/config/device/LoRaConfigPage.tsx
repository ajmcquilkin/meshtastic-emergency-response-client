import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useForm, DeepPartial } from "react-hook-form";
import { RotateCcw } from "lucide-react";

import debounce from "lodash.debounce";

import ConfigTitlebar from "@components/config/ConfigTitlebar";
import ConfigInput from "@components/config/ConfigInput";
import ConfigSelect from "@components/config/ConfigSelect";

import { LoRaConfigInput, configSliceActions } from "@features/config/slice";
import {
  selectCurrentRadioConfig,
  selectEditedRadioConfig,
} from "@features/config/selectors";

import { selectDevice } from "@features/device/selectors";
import { getDefaultConfigInput } from "@utils/form";

export interface ILoRaConfigPageProps {
  className?: string;
}

// See https://github.com/react-hook-form/react-hook-form/issues/10378
const parseLoRaConfigInput = (
  d: DeepPartial<LoRaConfigInput>
): DeepPartial<LoRaConfigInput> => ({
  ...d,
  region: parseInt(d.region as unknown as string),
  modemPreset: parseInt(d.modemPreset as unknown as string),
  bandwidth: parseInt(d.bandwidth as unknown as string),
  spreadFactor: parseInt(d.spreadFactor as unknown as string),
  codingRate: parseInt(d.codingRate as unknown as string),
  frequencyOffset: parseInt(d.frequencyOffset as unknown as string),
  hopLimit: parseInt(d.hopLimit as unknown as string),
  txPower: parseInt(d.txPower as unknown as string),
  channelNum: parseInt(d.channelNum as unknown as string),
});

const LoRaConfigPage = ({ className = "" }: ILoRaConfigPageProps) => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const device = useSelector(selectDevice());

  const currentConfig = useSelector(selectCurrentRadioConfig());
  const editedConfig = useSelector(selectEditedRadioConfig());

  const [useModemPreset, setUseModemPreset] = useState(
    !device?.config.lora?.modemPreset ?? false
  );

  const [txEnabled, setTxEnabled] = useState(
    device?.config.lora?.txEnabled ?? true
  );

  const defaultValues = useMemo(
    () =>
      getDefaultConfigInput(
        device?.config.lora ?? undefined,
        editedConfig.lora ?? undefined
      ),
    []
  );

  const updateStateFlags = (d: DeepPartial<LoRaConfigInput>) => {
    setUseModemPreset(!!d.usePreset);
    setTxEnabled(!!d.txEnabled);
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
  } = useForm<LoRaConfigInput>({
    defaultValues,
  });

  const updateConfigHander = useMemo(
    () =>
      debounce(
        (d: DeepPartial<LoRaConfigInput>) => {
          const data = parseLoRaConfigInput(d);
          updateStateFlags(data);
          dispatch(configSliceActions.updateRadioConfig({ lora: data }));
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
    if (!currentConfig?.lora) return;
    reset(currentConfig.lora);
    dispatch(configSliceActions.updateRadioConfig({ lora: null }));
  };

  return (
    <div className={`${className} flex-1 h-screen`}>
      <ConfigTitlebar
        title={t("config.radio.lora.title")}
        subtitle={t("config.radio.lora.description")}
        renderIcon={(c) => <RotateCcw className={c} />}
        buttonTooltipText={t("config.discardChanges")}
        onIconClick={handleFormReset}
      >
        <div className="flex flex-col gap-6">
          <ConfigSelect
            text={t("config.radio.lora.region.title")}
            {...register("region")}
          >
            <option value="0">{t("config.radio.lora.region.unset")}</option>
            <option value="1">{t("config.radio.lora.region.us")}</option>
            <option value="2">{t("config.radio.lora.region.eu433")}</option>
            <option value="3">{t("config.radio.lora.region.eu868")}</option>
            <option value="4">{t("config.radio.lora.region.china")}</option>
            <option value="5">{t("config.radio.lora.region.japan")}</option>
            <option value="6">{t("config.radio.lora.region.auNz")}</option>
            <option value="7">{t("config.radio.lora.region.korea")}</option>
            <option value="8">{t("config.radio.lora.region.taiwan")}</option>
            <option value="9">{t("config.radio.lora.region.russia")}</option>
            <option value="10">{t("config.radio.lora.region.india")}</option>
            <option value="11">{t("config.radio.lora.region.nz865")}</option>
            <option value="12">{t("config.radio.lora.region.ukraine")}</option>
            <option value="13">{t("config.radio.lora.region.thailand")}</option>
            <option value="14">{t("config.radio.lora.region.24ghz")}</option>
          </ConfigSelect>

          <ConfigInput
            type="checkbox"
            text={t("config.radio.lora.useModemPreset")}
            error={errors.usePreset?.message}
            {...register("usePreset")}
          />

          <ConfigSelect
            text={t("config.radio.lora.modemPreset.title")}
            disabled={!useModemPreset}
            {...register("modemPreset")}
          >
            <option value="0">
              {t("config.radio.lora.modemPreset.longFast")}
            </option>
            <option value="1">
              {t("config.radio.lora.modemPreset.longSlow")}
            </option>
            <option value="2">
              {t("config.radio.lora.modemPreset.veryLongSlow")}
            </option>
            <option value="3">
              {t("config.radio.lora.modemPreset.medSlow")}
            </option>
            <option value="4">
              {t("config.radio.lora.modemPreset.shortSlow")}
            </option>
            <option value="5">
              {t("config.radio.lora.modemPreset.shortFast")}
            </option>
            <option value="6">
              {t("config.radio.lora.modemPreset.longModerate")}
            </option>
          </ConfigSelect>

          <ConfigInput
            disabled={useModemPreset}
            type="number"
            text={t("config.radio.lora.bandwidth")}
            error={errors.bandwidth?.message}
            {...register("bandwidth")}
          />

          <ConfigInput
            disabled={useModemPreset}
            type="number"
            text={t("config.radio.lora.spreadFactor")}
            error={errors.spreadFactor?.message}
            {...register("spreadFactor")}
          />

          <ConfigInput
            disabled={useModemPreset}
            type="number"
            text={t("config.radio.lora.codingRate")}
            error={errors.codingRate?.message}
            {...register("codingRate")}
          />

          <ConfigInput
            type="number"
            text={t("config.radio.lora.freqOffset")}
            error={errors.frequencyOffset?.message}
            {...register("frequencyOffset")}
          />

          <ConfigInput
            type="number"
            text={t("config.radio.lora.hopLimit")}
            error={errors.hopLimit?.message}
            {...register("hopLimit")}
          />

          <ConfigInput
            type="checkbox"
            text={t("config.radio.lora.txEnabled")}
            error={errors.txEnabled?.message}
            {...register("txEnabled")}
          />

          <ConfigInput
            disabled={!txEnabled}
            type="number"
            text={t("config.radio.lora.txPower")}
            error={errors.txPower?.message}
            {...register("txPower")}
          />

          <ConfigInput
            disabled={!txEnabled}
            type="number"
            text={t("config.radio.lora.loraChannel")}
            error={errors.channelNum?.message}
            {...register("channelNum")}
          />

          <ConfigInput
            type="checkbox"
            text={t("config.radio.lora.euOverride")}
            error={errors.overrideDutyCycle?.message}
            {...register("overrideDutyCycle")}
          />

          {/* TODO OVERRIDE FREQUENCY */}
        </div>
      </ConfigTitlebar>
    </div>
  );
};

export default LoRaConfigPage;
