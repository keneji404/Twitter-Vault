import { AlertTriangle, CheckCircle, Info } from "lucide-react"; // <--- Removed 'X'

export type ModalType = "danger" | "success" | "info";

interface Props {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export const ConfirmModal = ({
  isOpen,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
}: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-6">
          <div className="flex gap-4">
            {/* Icon */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 
              ${
                type === "danger"
                  ? "bg-red-500/10 text-red-500"
                  : type === "success"
                  ? "bg-green-500/10 text-green-500"
                  : "bg-blue-500/10 text-blue-500"
              }`}
            >
              {type === "danger" && <AlertTriangle size={24} />}
              {type === "success" && <CheckCircle size={24} />}
              {type === "info" && <Info size={24} />}
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950/50 p-4 flex gap-3 justify-end border-t border-slate-800">
          {/* Cancel Button (Only show if it's a confirmation action, not just a success alert) */}
          {type !== "success" && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
          )}

          <button
            onClick={onConfirm}
            className={`px-6 py-2 rounded-lg text-sm font-bold text-white shadow-lg transition
              ${
                type === "danger"
                  ? "bg-red-600 hover:bg-red-700 shadow-red-900/20"
                  : type === "success"
                  ? "bg-green-600 hover:bg-green-700 shadow-green-900/20"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-900/20"
              }`}
          >
            {type === "success" ? "Okay" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
