import React from 'react';

interface ModuleChipProps {
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'active' | 'muted';
  onClick?: () => void;
}

export const ModuleChip: React.FC<ModuleChipProps> = ({
  label,
  icon,
  variant = 'default',
  onClick,
}) => {
  const variantClasses: Record<string, string> = {
    default: 'bg-white border border-gray-200 text-gray-700',
    active: 'bg-trenord-green text-white border border-trenord-green',
    muted: 'bg-gray-100 border border-gray-100 text-gray-500',
  };

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={[
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
        variantClasses[variant],
        onClick ? 'cursor-pointer select-none active:scale-95 transition-transform' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && <span className="w-3 h-3 flex-shrink-0">{icon}</span>}
      {label}
    </span>
  );
};