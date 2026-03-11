import * as React from 'react'

export interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const PageLayout: React.FC<PageLayoutProps>
