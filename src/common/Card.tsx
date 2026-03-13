import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}

export default function Card({ children, className = '', title, action }: CardProps) {
  return (
    <div className={`bg-(--bg-secondary) border border-(--border-color) rounded-xl shadow-xl overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--border-color)">
          {title && <h3 className="text-lg font-semibold text-(--text-primary)">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
