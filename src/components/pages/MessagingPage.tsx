import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

import ConfigIcon from "@components/config/ConfigIcon";
import ConfigLayout from "@components/config/ConfigLayout";
import ChannelDetailView from "@components/Messaging/ChannelDetailView";
import ChannelListElement from "@components/Messaging/ChannelListElement";

import { selectDeviceChannels } from "@features/device/deviceSelectors";
import { useNavigate } from "react-router-dom";
import { AppRoutes } from "@utils/routing";

const MessagingPage = () => {
  const channels = useSelector(selectDeviceChannels());
  const [activeChannelIdx, setActiveChannelIdx] = useState<number | null>(
    channels[0]?.config.index ?? null
  );

  const navigateTo = useNavigate();

  return (
    <div className="flex-1">
      <ConfigLayout
        title="Messaging"
        backtrace={["Messaging"]}
        renderIcons={(buttonClassName, iconClassName) => (
          <>
            <ConfigIcon
              onClick={() => navigateTo(AppRoutes.CONFIGURE_CHANNELS)}
              tooltipText="Configure channels"
              buttonClassName={buttonClassName}
            >
              <Cog6ToothIcon className={`${iconClassName}`} />
            </ConfigIcon>
          </>
        )}
        renderOptions={() =>
          channels
            .filter((c) => c.config.role !== 0) // * ignore DISABLED role
            .map((c) => (
              <ChannelListElement
                key={c.config.index}
                setActiveChannel={setActiveChannelIdx}
                channel={c}
                isSelected={c.config.index === activeChannelIdx}
              />
            ))
        }
      >
        {activeChannelIdx != null && !!channels[activeChannelIdx] ? (
          <ChannelDetailView channel={channels[activeChannelIdx]} />
        ) : (
          <div className="flex flex-col justify-center align-middle w-full h-full bg-gray-100">
            <p className="m-auto text-base font-normal text-gray-700">
              No channels selected
            </p>
          </div>
        )}
      </ConfigLayout>
    </div>
  );
};

export default MessagingPage;
