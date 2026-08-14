export type ToastType = "success" | "error" | "info";

export function withToast(path: string, message: string, type: ToastType = "success") {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${new URLSearchParams({ toast: message, toastType: type, toastId: crypto.randomUUID() }).toString()}`;
}
