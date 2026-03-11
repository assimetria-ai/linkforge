import * as React from 'react'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'destructive'
  title?: string
  dismissible?: boolean
}

export const Alert: React.FC<AlertProps>
