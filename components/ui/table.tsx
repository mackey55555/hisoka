import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <thead className={`bg-background border-b border-border ${className}`}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <tbody className={className}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <tr className={`border-b border-border hover:bg-background transition-colors ${className}`}>
      {children}
    </tr>
  );
};

export const TableHead: React.FC<TableProps & { onClick?: () => void; sortable?: boolean }> = ({
  children,
  className = '',
  onClick,
  sortable = false,
}) => {
  return (
    <th
      className={`px-4 py-3 text-left text-sm font-medium text-text-primary ${sortable ? 'cursor-pointer hover:bg-primary/10' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="text-text-secondary text-xs">↕</span>
        )}
      </div>
    </th>
  );
};

export const TableCell: React.FC<TableProps & { colSpan?: number }> = ({
  children,
  className = '',
  colSpan,
}) => {
  return (
    <td
      className={`px-4 py-3 text-sm text-text-primary ${className}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
};

