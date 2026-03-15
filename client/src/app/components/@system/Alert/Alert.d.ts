// Type declarations for Alert.jsx — makes all props optional.
import type { HTMLAttributes, ReactNode } from 'react'

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'destructive'
  title?: string
  dismissible?: boolean
  onClose?: () => void
  className?: string
  children?: ReactNode
}

export declare function Alert(props: AlertProps): JSX.Element | null
