/**
 * Whether the OS lets this process drive the desktop. On macOS these are the
 * Accessibility and Screen Recording permissions in System Settings › Privacy & Security.
 */
export interface DesktopPermissions {
  readonly canControlInput: boolean;
  readonly canCaptureScreen: boolean;
}
