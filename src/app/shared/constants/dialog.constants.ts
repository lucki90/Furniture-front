/**
 * Standard dialog widths for MatDialog.open().
 * Use these instead of hardcoded pixel strings.
 */
export const DIALOG_WIDTH = {
  /** 420px — small dialogs (confirmations) */
  SMALL: '420px',
  /** 500px — standard dialogs (forms) */
  STANDARD: '500px',
  /** 600px — wide dialogs (complex forms, tables) */
  WIDE: '600px',
} as const;
