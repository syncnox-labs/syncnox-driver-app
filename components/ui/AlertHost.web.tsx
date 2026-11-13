import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { finishAlert, useAlertStore } from '@/utils/alert.web';
import './AlertHost.web.css';

function AlertDialog() {
  const alert = useAlertStore((state) => state.alerts[0]);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!alert) return;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, [alert]);

  if (!alert) return null;

  return (
    <dialog
      ref={ref}
      className="syncnox-alert"
      aria-labelledby="syncnox-alert-title"
      aria-describedby={alert.message ? 'syncnox-alert-message' : undefined}
      onCancel={(event) => {
        event.preventDefault();
        finishAlert(alert.id);
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) {
          finishAlert(alert.id);
        }
      }}
    >
      <h2 id="syncnox-alert-title">{alert.title}</h2>
      {alert.message && <p id="syncnox-alert-message">{alert.message}</p>}
      <div className="syncnox-alert-actions">
        {alert.buttons.map((button, index) => (
          <button
            key={index}
            type="button"
            data-style={button.style ?? 'default'}
            onClick={() => finishAlert(alert.id, index)}
          >
            {button.text ?? 'OK'}
          </button>
        ))}
      </div>
    </dialog>
  );
}

export default function AlertHost() {
  return typeof document === 'undefined' ? null : createPortal(<AlertDialog />, document.body);
}
