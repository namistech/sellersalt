// Barrel export for the primitive/core UI layer —
// docs/design/frontend-execution-plan-v1.md §6, Tier 1–2.
// overlay-utils.ts and FormField.tsx are intentionally not re-exported
// here: they're internal plumbing consumed by Dialog/Drawer and by
// Input/Textarea/Select/SearchInput respectively, not standalone
// primitives in their own right.

export { cn, FOCUS_RING } from "./cn";
export type { ClassValue } from "./cn";

export { Heading, Text, Label, Caption, Eyebrow, DataText } from "./Typography";
export type { HeadingProps, TextProps, LabelProps, CaptionProps, EyebrowProps, DataTextProps } from "./Typography";

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { IconButton } from "./IconButton";
export type { IconButtonProps } from "./IconButton";

export { Input } from "./Input";
export type { InputProps } from "./Input";

export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";

export { Select } from "./Select";
export type { SelectProps, SelectOption } from "./Select";

export { SearchInput } from "./SearchInput";
export type { SearchInputProps } from "./SearchInput";

export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";

export { Radio } from "./Radio";
export type { RadioProps } from "./Radio";

export { Switch } from "./Switch";
export type { SwitchProps } from "./Switch";

export { Badge } from "./Badge";
export type { BadgeProps, BadgeVariant } from "./Badge";

export { StatusIndicator } from "./StatusIndicator";
export type { StatusIndicatorProps, Status } from "./StatusIndicator";

export { Avatar, AvatarGroup } from "./Avatar";
export type { AvatarProps, AvatarGroupProps, AvatarSize } from "./Avatar";

export { Card, InteractiveCard } from "./Card";
export type { CardProps, InteractiveCardProps, CardPadding } from "./Card";

export { Divider } from "./Divider";
export type { DividerProps } from "./Divider";

export { Tooltip } from "./Tooltip";
export type { TooltipProps, TooltipSide } from "./Tooltip";

export { Spinner } from "./Spinner";
export type { SpinnerProps, SpinnerSize } from "./Spinner";

export { Skeleton } from "./Skeleton";
export type { SkeletonProps, SkeletonVariant } from "./Skeleton";

export { Alert } from "./Alert";
export type { AlertProps, AlertVariant } from "./Alert";

export { Dialog } from "./Dialog";
export type { DialogProps, DialogSize } from "./Dialog";

export { Drawer } from "./Drawer";
export type { DrawerProps, DrawerSide, DrawerSize } from "./Drawer";

export { Tabs } from "./Tabs";
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsPanelProps } from "./Tabs";

export { Breadcrumbs } from "./Breadcrumbs";
export type { BreadcrumbsProps, BreadcrumbItem } from "./Breadcrumbs";

export { IntelligenceCard } from "./IntelligenceCard";
export type { IntelligenceCardProps } from "./IntelligenceCard";

