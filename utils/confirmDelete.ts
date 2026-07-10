import { Alert } from "react-native";

/**
 * Show a standard destructive-delete confirmation dialog. The confirm button is
 * styled destructive and the callback only fires when the user confirms.
 */
export function confirmDelete({
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
}) {
  Alert.alert(title, message, [
    { text: cancelText, style: "cancel" },
    { text: confirmText, style: "destructive", onPress: onConfirm },
  ]);
}
