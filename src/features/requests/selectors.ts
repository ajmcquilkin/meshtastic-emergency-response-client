import type { RootState } from "@app/store";
import type { RequestStatus } from "@features/requests/slice";

export const selectRequestStateByName =
  (name: string) =>
  (state: RootState): RequestStatus | null =>
    state.requests.status?.[name] ?? null;
