import useProductStore from '../store/useProductStore.js';

export default function Toast() {
  const toast = useProductStore((s) => s.toast);

  if (!toast) return null;

  return (
    <div
      className={`notif ${toast.type === 'success' ? 'bg-vf-success' : toast.type === 'warning' ? 'bg-vf-red' : 'bg-vf-dark'}`}
    >
      {toast.message}
    </div>
  );
}
