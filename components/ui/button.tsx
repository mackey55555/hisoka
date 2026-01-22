import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-transparent border-2 border-primary text-primary hover:bg-primary/10',
    ghost: 'bg-transparent text-primary hover:bg-primary/10',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

