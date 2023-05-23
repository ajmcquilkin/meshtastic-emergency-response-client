import React from "react";
import type { ReactNode } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

export interface IDefaultTooltipProps {
  text: string;
  children: ReactNode;
  side?: Tooltip.TooltipContentProps["side"];
  deactivate?: boolean;
}

const DefaultTooltip = ({
  text,
  children,
  side = "top",
  deactivate = false,
}: IDefaultTooltipProps) => {
  if (deactivate) return <>{children}</>;

  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={300}>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="px-3 py-1.5 shadow-lg rounded-lg bg-white border border-gray-200 text-xs font-normal text-gray-400"
            side={side}
            sideOffset={5}
            avoidCollisions
            collisionPadding={20}
          >
            {text}
            <Tooltip.Arrow className="fill-gray-200" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

export default DefaultTooltip;
