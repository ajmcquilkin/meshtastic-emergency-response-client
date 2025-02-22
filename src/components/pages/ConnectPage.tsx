import * as Tabs from "@radix-ui/react-tabs";
import { open } from "@tauri-apps/api/shell";
import { FormEventHandler, useCallback, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import Hero_Image from "@app/assets/onboard_hero_image.jpg";

import { ConnectTab } from "@components/connection/ConnectTab";
import { SerialConnectPane } from "@components/connection/SerialConnectPane";
import { TcpConnectPane } from "@components/connection/TcpConnectPane";

import { useAppConfigApi } from "@features/appConfig/api";
import { selectPersistedTCPConnectionMeta } from "@features/appConfig/selectors";
import { selectConnectionStatus } from "@features/connection/selectors";
import { connectionSliceActions } from "@features/connection/slice";
import { DeviceApiActions, useDeviceApi } from "@features/device/api";
import {
  selectAutoConnectPort,
  selectAvailablePorts,
} from "@features/device/selectors";
import { requestSliceActions } from "@features/requests/slice";

import { ConnectionType } from "@utils/connections";
import { useIsDarkMode } from "@utils/hooks";

import "@components/SplashScreen/SplashScreen.css";
import { MeshtasticLogo } from "@app/assets/Meshtastic";

const getFullSocketAddress = (address: string, port: string) =>
  `${address}:${port}`;

export interface IOnboardPageProps {
  unmountSelf: () => void;
}

export const ConnectPage = ({ unmountSelf }: IOnboardPageProps) => {
  const { t } = useTranslation();

  const appConfigApi = useAppConfigApi();
  const deviceApi = useDeviceApi();

  const { isDarkMode } = useIsDarkMode();

  const dispatch = useDispatch();
  const availableSerialPorts = useSelector(selectAvailablePorts());
  const autoConnectPort = useSelector(selectAutoConnectPort());

  // UI state
  const [isScreenActive, setScreenActive] = useState(true);
  const [isAdvancedOpen, setAdvancedOpen] = useState(false);

  // Connection-level state, held here to persist across tab switches
  const [selectedPortName, setSelectedPortName] = useState("");
  const [socketAddress, setSocketAddress] = useState("");
  const [socketPort, setSocketPort] = useState("4403");

  // Advanced serial options, held here to persist across tab switches
  const [baudRate, setBaudRate] = useState(115_200);
  const [dtr, setDtr] = useState(true);
  const [rts, setRts] = useState(false);

  // autoConnectPort takes priority over selectedPortName if it exists
  const activePort = autoConnectPort ?? selectedPortName;

  const activePortState = useSelector(selectConnectionStatus(activePort)) ?? {
    status: "IDLE",
  };

  const activeSocketState = useSelector(
    selectConnectionStatus(getFullSocketAddress(socketAddress, socketPort)),
  ) ?? {
    status: "IDLE",
  };

  const persistedTCPConnectionMeta = useSelector(
    selectPersistedTCPConnectionMeta(),
  );

  const requestPorts = useCallback(() => {
    deviceApi.getAvailableSerialPorts();
  }, [dispatch]);

  const handleSocketConnect: FormEventHandler = (e) => {
    e.preventDefault();

    appConfigApi.persistLastTcpConnectionMeta({
      address: socketAddress,
      port: parseInt(socketPort),
    });

    deviceApi.connectToDevice({
      params: {
        type: ConnectionType.TCP,
        socketAddress: getFullSocketAddress(socketAddress, socketPort),
      },
      setPrimary: true,
    });
  };

  const refreshPorts = () => {
    dispatch(
      requestSliceActions.clearRequestState({
        name: DeviceApiActions.ConnectToDevice,
      }),
    );
    dispatch(connectionSliceActions.clearAllConnectionState());
    requestPorts();
  };

  const handlePortSelected = (portName: string) => {
    setSelectedPortName(portName);
    deviceApi.connectToDevice({
      params: { type: ConnectionType.SERIAL, portName, dtr, rts },
      setPrimary: true,
    });
  };

  const openExternalLink = (url: string) => () => {
    open(url);
  };

  useEffect(() => {
    deviceApi.disconnectFromAllDevices();
    deviceApi.getAutoConnectPort();

    appConfigApi.fetchLastTcpConnectionMeta();

    requestPorts();
  }, [dispatch, requestPorts]);

  // Initialize TCP state to persisted state
  useEffect(() => {
    if (!persistedTCPConnectionMeta) return;

    const { address, port } = persistedTCPConnectionMeta;
    setSocketAddress(address);
    setSocketPort(port.toString());
  }, [persistedTCPConnectionMeta]);

  // Wait to allow user to recognize serial connection succeeded
  useEffect(() => {
    if (
      activePortState.status !== "SUCCESSFUL" &&
      activeSocketState.status !== "SUCCESSFUL"
    )
      return;

    const delayHandle = setTimeout(() => {
      setScreenActive(false);
    }, 600);

    return () => {
      clearTimeout(delayHandle);
    };
  }, [activePortState, activeSocketState]);

  // Move to main page upon successful port connection (need to trigger when port is succesfully connected)
  useEffect(() => {
    if (isScreenActive) return;

    const unmountHandle = setTimeout(() => {
      unmountSelf();
    }, 900);

    return () => {
      clearTimeout(unmountHandle);
    };
  }, [isScreenActive, unmountSelf]);

  return (
    <div
      className="landing-screen-opacity-transition absolute flex flex-row h-screen w-screen z-40 bg-white dark:bg-gray-800"
      style={{ opacity: isScreenActive ? 1 : 0 }}
    >
      <div className="flex flex-col flex-1 py-24 overflow-auto no-gutter hide-scrollbar">
        <div className="flex justify-center">
          <div className="h-1/8">
            <div className="h-9 dark:text-white text-black">
              <MeshtasticLogo />
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-10">
          <h1 className="text-4xl font-semibold leading-10 text-gray-800 dark:text-gray-300">
            {t("connectPage.title")}
          </h1>
        </div>

        <div className="flex justify-center mt-5">
          <h2 className="text-base leading-6 font-normal text-gray-500 dark:text-gray-400 pl-40 pr-40 text-center">
            <Trans
              i18nKey={"connectPage.supportedRadioBlurb"}
              components={{
                linkButton: (
                  <button
                    type="button"
                    onClick={() =>
                      open("https://meshtastic.org/docs/introduction")
                    }
                    className="hover:cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 underline transition-colors"
                  />
                ),
              }}
            />
          </h2>
        </div>

        <div className="flex justify-center mt-5">
          <Tabs.Root className="w-3/5" defaultValue={ConnectionType.SERIAL}>
            <Tabs.List
              className="flex flex-row"
              aria-label="Choose a connection type"
            >
              <ConnectTab
                label={t("connectPage.tabs.serial.title")}
                tooltip={t("connectPage.tabs.serial.tooltip")}
                value={ConnectionType.SERIAL}
              />
              <ConnectTab
                label={t("connectPage.tabs.tcp.title")}
                tooltip={t("connectPage.tabs.tcp.tooltip")}
                value={ConnectionType.TCP}
              />
            </Tabs.List>

            <Tabs.Content value={ConnectionType.SERIAL}>
              <SerialConnectPane
                availableSerialPorts={availableSerialPorts}
                activePort={activePort}
                activePortState={activePortState}
                handlePortSelected={handlePortSelected}
                refreshPorts={refreshPorts}
                isAdvancedOpen={isAdvancedOpen}
                setAdvancedOpen={setAdvancedOpen}
                baudRate={baudRate}
                setBaudRate={setBaudRate}
                dtr={dtr}
                setDtr={setDtr}
                rts={rts}
                setRts={setRts}
              />
            </Tabs.Content>

            <Tabs.Content value={ConnectionType.TCP}>
              <TcpConnectPane
                socketAddress={socketAddress}
                setSocketAddress={setSocketAddress}
                socketPort={socketPort}
                setSocketPort={setSocketPort}
                activeSocketState={activeSocketState}
                handleSocketConnect={handleSocketConnect}
              />
            </Tabs.Content>
          </Tabs.Root>
        </div>
      </div>

      <div className="flex-1 relative hidden xl:block">
        <img
          className="w-full h-full object-cover object-center bg-gray-700"
          src={Hero_Image}
          alt="Meshtastic Emergency Response Client hero"
        />
        <p className="landing-screen-opacity-transition absolute bottom-3 right-3 text-right text-sm text-gray-600">
          <Trans
            i18nKey={"connectPage.photoAttribution"}
            components={{
              link1: (
                <button
                  type="button"
                  className="hover:underline"
                  onClick={openExternalLink(
                    "https://unsplash.com/@jordansteranka?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText",
                  )}
                />
              ),
              link2: (
                <button
                  type="button"
                  className="hover:underline"
                  onClick={openExternalLink(
                    "https://unsplash.com/photos/snpFW42KR8I?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText",
                  )}
                />
              ),
            }}
          />
        </p>
      </div>
    </div>
  );
};
