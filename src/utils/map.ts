export enum MapIDs {
  MapView = "MapView",
  CreateWaypointDialog = "CreateWaypointDialog",
  ChannelWaypointMessage = "ChannelWaypointMessage",
}

export const formatLocation = (location: number): string =>
  `${location.toFixed(5)}°`;

export const getFlyToConfig = (target: {
  lng: number;
  lat: number;
}): maplibregl.FlyToOptions => ({
  center: [target.lng, target.lat],
  bearing: 0,
  pitch: 0,
  speed: 0.6,
});

export const getWaypointMapId = (id: number): string => {
  return `${MapIDs.ChannelWaypointMessage}_${id}`;
};
