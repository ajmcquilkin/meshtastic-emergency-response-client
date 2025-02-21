import type { PickingInfo } from "deck.gl/typed";

export interface IMapEdgeTooltip {
  hoverInfo: PickingInfo;
}

export const MapEdgeTooltip = ({ hoverInfo }: IMapEdgeTooltip) => {
  const { object, x, y } = hoverInfo;

  const snr: number | null = object?.properties?.snr ?? null;

  return (
    <div
      className="pointer-events-none absolute z-10 text-center whitespace-nowrap px-2 py-1 default-overlay text-xs text-gray-500 z-[inherit]"
      style={{ left: x, top: y }}
    >
      <p>SNR: {snr ?? "UNK"}</p>
    </div>
  );
};
