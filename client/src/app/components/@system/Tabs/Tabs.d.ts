import * as React from 'react'

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export const Tabs: React.FC<TabsProps>
export const TabsList: React.FC<TabsListProps>
export const TabsTrigger: React.FC<TabsTriggerProps>
export const TabsContent: React.FC<TabsContentProps>
