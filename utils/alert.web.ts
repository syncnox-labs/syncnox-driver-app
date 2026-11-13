import type { Alert as NativeAlert, AlertButton, AlertOptions } from 'react-native';
import { create } from 'zustand';

interface WebAlert {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
}

let nextId = 0;

export const useAlertStore = create<{ alerts: WebAlert[] }>(() => ({ alerts: [] }));

export const Alert = {
  alert(...[title, message, buttons, options]: Parameters<typeof NativeAlert.alert>) {
    useAlertStore.setState(({ alerts }) => ({
      alerts: [...alerts, {
        id: ++nextId,
        title: title ?? '',
        message: message ?? undefined,
        buttons: buttons?.length ? buttons : [{ text: 'OK' }],
        options,
      }],
    }));
  },
};

/** Remove the dialog before running callbacks so retries/errors can open another. */
export function finishAlert(id: number, buttonIndex?: number) {
  const alert = useAlertStore.getState().alerts[0];
  if (!alert || alert.id !== id) return;
  if (buttonIndex === undefined && !alert.options?.cancelable) return;
  const button = buttonIndex === undefined ? undefined : alert.buttons[buttonIndex];
  if (buttonIndex !== undefined && !button) return;
  useAlertStore.setState(({ alerts }) => ({ alerts: alerts.slice(1) }));
  if (button) button.onPress?.();
  else alert.options?.onDismiss?.();
}
