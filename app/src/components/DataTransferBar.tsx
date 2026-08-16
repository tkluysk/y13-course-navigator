import { useRef, useState } from "react";
import { downloadExport, importData } from "../dataTransfer";

export default function DataTransferBar() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const result = importData(text);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    window.location.reload();
  };

  return (
    <div className="data-transfer-bar">
      <button
        type="button"
        className="data-transfer-btn"
        onClick={downloadExport}
        title="Download your scenarios, bookmarks and not-interested marks as a file"
      >
        Export choices
      </button>
      <button
        type="button"
        className="data-transfer-btn"
        onClick={handleImportClick}
        title="Load choices from a previously exported file — replaces what's saved on this device"
      >
        Import choices
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="data-transfer-file-input"
        onChange={handleFileChange}
      />
      {importError && <span className="data-transfer-error">{importError}</span>}
    </div>
  );
}
