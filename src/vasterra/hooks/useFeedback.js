import { useMemo, useState } from "react";
import { uid } from "../core/factories";

export function useFeedback() {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);

  const pushToast = (message, type = "info", ttl = 2600) => {
    const id = uid();
    setToasts((prev) => [...prev, { id, message, type }]);
    if (ttl > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, ttl);
    }
    return id;
  };

  const closeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const confirmAction = ({ title = "Confirmar", message = "Tem certeza?", onConfirm }) => {
    setConfirm({ title, message, onConfirm });
  };

  const cancelConfirm = () => setConfirm(null);

  const runConfirm = () => {
    if (confirm?.onConfirm) confirm.onConfirm();
    setConfirm(null);
  };

  return useMemo(() => ({
    toasts,
    confirm,
    pushToast,
    closeToast,
    confirmAction,
    cancelConfirm,
    runConfirm,
  }), [toasts, confirm]);
}
