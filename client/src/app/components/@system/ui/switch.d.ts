// Type declarations for switch.jsx — makes id and className optional.
export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  className?: string
}

export declare function Switch(props: SwitchProps): JSX.Element
