import { useTranslation } from "react-i18next";

import { MeshtasticLogo } from "@app/assets/Meshtastic";

import { useIsDarkMode } from "@utils/hooks";

import "@components/Sidebar/Sidebar.css";

export interface IMeshLogoProps {
  isSidebarExpanded: boolean;
}

export const SidebarLogo = ({ isSidebarExpanded }: IMeshLogoProps) => {
  const { t } = useTranslation();

  const { isDarkMode } = useIsDarkMode();

  return (
    <div className="flex flex-row justify-start align-middle h-20 p-4 border-b border-gray-100 dark:border-gray-700">
      <div className="text-white dark:text-black my-auto p-3 bg-gray-700 dark:bg-gray-200 rounded-lg h-12 w-12">
        <MeshtasticLogo />
      </div>
      <div
        className="sidebar-opacity-transition my-auto pl-4 whitespace-nowrap"
        style={isSidebarExpanded ? { opacity: 1 } : { opacity: 0 }}
      >
        <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">
          {t("general.meshtastic")}
        </p>
        <p className="text-gray-400 dark:text-gray-400 text-xs font-normal">
          {t("general.networkManagement")}
        </p>
      </div>
    </div>
  );
};
