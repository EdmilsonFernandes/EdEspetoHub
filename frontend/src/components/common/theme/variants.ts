/**
 * Variant System - Reusable component variant definitions
 * Follows atomic design principles for consistent styling
 */

export const buttonVariants = {
  primary: {
    default: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 disabled:opacity-60',
    filled: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 disabled:opacity-60',
    outline: 'border-2 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950',
    ghost: 'text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950',
  },
  secondary: {
    default: 'bg-gray-300 text-gray-900 hover:bg-gray-400 active:bg-gray-500 disabled:opacity-60',
    filled: 'bg-gray-300 text-gray-900 hover:bg-gray-400 active:bg-gray-500 disabled:opacity-60',
    outline: 'border-2 border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800',
    ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
  },
  accent: {
    default: 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60',
    filled: 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60',
    outline: 'border-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950',
    ghost: 'text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950',
  },
  success: {
    default: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 disabled:opacity-60',
    filled: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 disabled:opacity-60',
    outline: 'border-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950',
    ghost: 'text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-950',
  },
  error: {
    default: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 disabled:opacity-60',
    filled: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 disabled:opacity-60',
    outline: 'border-2 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950',
    ghost: 'text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950',
  },
} as const;

export const buttonSizes = {
  xs: 'px-2 py-1 text-xs rounded-md',
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-base rounded-lg',
  lg: 'px-6 py-3 text-lg rounded-xl',
  xl: 'px-8 py-4 text-lg rounded-xl',
} as const;

export const inputVariants = {
  default: 'border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:focus:ring-red-500 dark:focus:border-red-500',
  outline: 'border-2 border-gray-200 dark:border-gray-700 focus:border-red-500 dark:focus:border-red-500',
  underline: 'border-b-2 border-gray-300 dark:border-gray-600 focus:border-red-500 dark:focus:border-red-500 rounded-none px-0',
  error: 'border border-red-400 dark:border-red-600 focus:ring-2 focus:ring-red-500 focus:border-red-500',
  success: 'border border-green-400 dark:border-green-600 focus:ring-2 focus:ring-green-500 focus:border-green-500',
} as const;

export const inputSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-3 text-base',
  lg: 'px-4 py-3 text-lg',
} as const;

export const labelVariants = {
  default: 'text-sm font-semibold text-gray-700 dark:text-gray-300',
  required: 'text-sm font-semibold text-gray-700 dark:text-gray-300 after:content-["*"] after:ml-1 after:text-red-500',
} as const;

export const baseTransition = 'transition-all duration-200 ease-in-out';

export const baseRadius = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;
export type InputVariant = keyof typeof inputVariants;
export type InputSize = keyof typeof inputSizes;
export type LabelVariant = keyof typeof labelVariants;
