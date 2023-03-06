import React from "react";

import {
  MapIconButton,
  MapIconUnimplemented,
} from "@components/Map/MapIconButton";
import { MapPinIcon, Square3Stack3DIcon } from "@heroicons/react/24/outline";
import { useSelector, useDispatch } from "react-redux";
import { selectIsNewWaypoint } from "@features/device/deviceSelectors";
import { deviceSliceActions } from "@features/device/deviceSlice";

const MapInteractionPane = () => {
  const dispatch = useDispatch();

  const newWaypoint = useSelector(selectIsNewWaypoint());

  // Toggles newWaypoint state, which allows for creation of new waypoints on map
  const handleClickMapPin = () => {
    dispatch(deviceSliceActions.setNewWaypoint(!newWaypoint));
  };

  return (
    <div className="absolute top-9 right-9 flex gap-4">
      {/* Toggles newWaypoint state */}
      <MapIconButton
        className={`p-2 text-gray-500 ${
          newWaypoint ? "bg-gray-200" : "bg-white"
        } `}
        onClick={handleClickMapPin}
      >
        <MapPinIcon className="w-6 h-6" />
      </MapIconButton>

      {/* Currently implemented using MapIconUnimplemented, which allows for a popup. */}
      {/* When functionality is implemented, change component to MapIconButton. */}
      <MapIconUnimplemented
        className="p-2 text-gray-500 bg-white"
        onClick={() => console.log()}
      >
        <Square3Stack3DIcon className="w-6 h-6" />
      </MapIconUnimplemented>
    </div>
  );
};

export default MapInteractionPane;
