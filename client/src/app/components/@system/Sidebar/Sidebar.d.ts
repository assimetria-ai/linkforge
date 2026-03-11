import * as React from 'react'

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
}

export interface SidebarSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export interface SidebarItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick?: () => void
}

export const Sidebar: React.FC<SidebarProps>
export const SidebarSection: React.FC<SidebarSectionProps>
export const SidebarItem: React.FC<SidebarItemProps>
