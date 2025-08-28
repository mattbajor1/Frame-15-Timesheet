export default function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div
      className="fixed bottom-4 right-4 bg-white rounded-2xl shadow-lg border border-neutral-200 px-4 py-2 text-sm"
      onAnimationEnd={() => onClose?.()}
    >
      {message}
    </div>
  );
}
