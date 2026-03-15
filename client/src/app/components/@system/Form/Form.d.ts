// Type declarations for Form.jsx — makes all props optional.
import type { InputHTMLAttributes, ReactNode } from 'react'

export interface FormFieldProps {
  label?: string
  error?: string
  required?: boolean
  children?: ReactNode
  className?: string
}

export declare function FormField(props: FormFieldProps): JSX.Element

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
  error?: string
}

export declare function Input(props: InputProps): JSX.Element
