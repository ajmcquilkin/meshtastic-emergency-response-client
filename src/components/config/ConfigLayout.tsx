import React from "react";
import type { ReactNode } from "react";

import NavigationBacktrace from "@components/NavigationBacktrace";

export interface IConfigLayoutProps {
  title: string;
  backtrace: string[];
  renderIcons: (buttonClassName: string, iconClassName: string) => ReactNode;
  renderOptions: () => JSX.Element[];
  children: ReactNode;
}

const ConfigLayout = ({
  title,
  backtrace,
  renderIcons,
  renderOptions,
  children,
}: IConfigLayoutProps) => {
  return (
    <div className="flex flex-row w-full h-screen">
      <div className="flex flex-col w-96 after:shadow-lg">
        <div className="flex justify-center align-middle px-9 h-20 border-b border-gray-100">
          <NavigationBacktrace className="my-auto mr-auto" levels={backtrace} />
        </div>

        <div className="flex flex-col flex-1 px-9 py-6 overflow-y-auto">
          <div className="flex flex-row justify-between align-middle mb-6">
            <h1 className="text-4xl leading-10 font-semibold text-gray-700">
              {title}
            </h1>

            <div className="flex flex-row gap-6">
              {renderIcons("cursor-pointer", "w-6 h-6 text-gray-400 my-auto")}
            </div>
          </div>

          <div className="flex flex-col flex-1 gap-3">{renderOptions()}</div>
        </div>
      </div>

      <div className="flex flex-col flex-1">{children}</div>
    </div>
  );
};

export default ConfigLayout;
