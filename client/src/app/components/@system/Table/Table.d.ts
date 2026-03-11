import * as React from 'react'

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}
export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}
export interface TableHeadProps extends React.HTMLAttributes<HTMLTableCellElement> {}
export interface TableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {}

export const Table: React.FC<TableProps>
export const TableHeader: React.FC<TableHeaderProps>
export const TableBody: React.FC<TableBodyProps>
export const TableRow: React.FC<TableRowProps>
export const TableHead: React.FC<TableHeadProps>
export const TableCell: React.FC<TableCellProps>
