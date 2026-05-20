import {
  Home,
  TrainFront,
  Shield,
  MessageSquareWarning,
  Users,
} from 'lucide-react';

import type {
  Tab,
} from '../types';

interface Props {

  activeTab: Tab;

  onChange: (
    tab: Tab
  ) => void;

  adminMode?: boolean;
}

export default function TabBar({
  activeTab,
  onChange,
  adminMode = false,
}: Props) {

  const tabs = [

    {
      id: 'salette',
      label: 'Salette',
      icon: Home,
    },

    {
      id: 'stazioni',
      label: 'Stazioni',
      icon: TrainFront,
    },

    {
      id: 'contributi',
      label: 'Contributi',
      icon: Users,
    },

    // ADMIN ONLY
    ...(adminMode
      ? [

          {
            id: 'segnalazioni',
            label:
              'Segnalazioni',
            icon:
              MessageSquareWarning,
          },

          {
            id: 'admin',
            label: 'Admin',
            icon: Shield,
          },
        ]
      : []),
  ];

  return (

    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(6px,env(safe-area-inset-bottom))]">

      <div className="max-w-2xl mx-auto">

        <div className="bg-white/95 backdrop-blur-xl border border-gray-200 shadow-lg rounded-2xl px-2 py-1.5 flex items-center justify-around">

          {tabs.map((tab) => {

            const Icon =
              tab.icon;

            const isActive =
              activeTab ===
              tab.id;

            return (

              <button
                key={tab.id}
                onClick={() =>
                  onChange(
                    tab.id as Tab
                  )
                }
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all min-w-[68px] ${
                  isActive
                    ? 'bg-trenord-green text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >

                <Icon className="w-5 h-5" />

                <span className="text-[11px] font-medium">

                  {tab.label}

                </span>

              </button>
            );
          })}

        </div>

      </div>

    </div>
  );
}