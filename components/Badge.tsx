
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant: 'green' | 'gray' | 'orange' | 'blue' | 'red';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant }) => {
  const styles = {
    green: 'bg-green-100 text-green-700 border-green-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    red: 'bg-red-100 text-red-700 border-red-200',
  };

  const translationMap: Record<string, string> = {
    'Reviewed': 'Đã duyệt',
    'Pending': 'Chờ duyệt',
    'Edited': 'Đã sửa',
    'Ready': 'Sẵn sàng',
    'Processing': 'Đang xử lý',
    'Failed': 'Lỗi',
    'Error': 'Lỗi'
  };

  const label = typeof children === 'string' ? (translationMap[children] || children) : children;

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[variant]}`}>
      {label}
    </span>
  );
};
