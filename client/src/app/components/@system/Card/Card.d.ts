import * as React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps>
export const CardHeader: React.FC<CardHeaderProps>
export const CardTitle: React.FC<CardTitleProps>
export const CardDescription: React.FC<CardDescriptionProps>
export const CardContent: React.FC<CardContentProps>
export const CardFooter: React.FC<CardFooterProps>
