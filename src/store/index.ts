import { configureStore, MiddlewareArray } from "@reduxjs/toolkit";
import { logger } from "redux-logger";

import { appConfigReducer } from "@features/appConfig/slice";
import { configReducer } from "@features/config/slice";
import { connectionReducer } from "@features/connection/slice";
import { deviceReducer } from "@features/device/slice";
import { graphReducer } from "@features/graph/slice";
import { mapReducer } from "@features/map/slice";
import { requestReducer } from "@features/requests/slice";
import { uiReducer } from "@features/ui/slice";

const middleware = [logger];

export const store = configureStore({
  reducer: {
    appConfig: appConfigReducer,
    config: configReducer,
    connection: connectionReducer,
    devices: deviceReducer,
    graph: graphReducer,
    map: mapReducer,
    requests: requestReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ thunk: false }).concat(
      middleware as MiddlewareArray<[]>,
    ),
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
