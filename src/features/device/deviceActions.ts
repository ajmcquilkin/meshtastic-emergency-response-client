import { createAction } from "@reduxjs/toolkit";
import type { User } from "@bindings/protobufs/User";

export const requestAvailablePorts = createAction(
  "@device/request-available-ports"
);

export const requestConnectToDevice = createAction<string>(
  "@device/request-connect"
);

export const requestDisconnectFromDevice = createAction(
  "@device/request-disconnect"
);

export const requestSendMessage = createAction<{ text: string; channel: 0 }>(
  "@device/request-send-message"
);

export const requestUpdateUser = createAction<{ user: User }>(
  "@device/update-device-user"
);
