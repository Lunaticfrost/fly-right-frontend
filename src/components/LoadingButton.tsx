'use client'
import React from 'react'

interface LoadingButtonProps {
  onClick?: () => void | Promise<void>
  disabled?: boolean
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
  className?: string
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingButton({
  onClick,
  disabled = false,
  loading = false,
  loadingText = 'Loading...',
  children,
  className = '',
  type = 'button',
  variant = 'primary',
  size = 'md'
}: LoadingButtonProps) {
  const baseClasses = 'font-semibold transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white',
    secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    success: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm rounded-md',
    md: 'px-4 py-3 rounded-lg',
    lg: 'px-6 py-4 text-lg rounded-lg'
  }
  
  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`
  
  const isDisabled = disabled || loading
  
  const handleClick = async () => {
    if (isDisabled || !onClick) return
    
    try {
      await onClick()
    } catch (error) {
      console.error('Button click error:', error)
    }
  }
  
  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={buttonClasses}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          {loadingText}
        </div>
      ) : (
        children
      )}
    </button>
  )
} 