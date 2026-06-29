import type { ReactNode } from "react";
import Modal from "./Modal";

type ConfirmDialogProps = {
  open: boolean;
  title?: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  children?: ReactNode;
};

function ConfirmDialog({
  open,
  title = "Confirm action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={open} onClose={onCancel} title={title} size="sm">
      <p className="dialog-message">{message}</p>
      {children}
      <div className="modal-actions">
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button className={`btn btn-${tone}`} type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
