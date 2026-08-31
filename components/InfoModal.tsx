import { INFO_TEXTS } from "@/lib/info-texts";
import { Sheet, SaveButton } from "./Sheet";

export default function InfoModal({ infoKey, onClose }: { infoKey: string | null; onClose: () => void }) {
  const [title, text] = infoKey ? INFO_TEXTS[infoKey] || ["", ""] : ["", ""];
  return (
    <Sheet show={!!infoKey} onClose={onClose}>
      <div style={{ fontWeight: 700, fontSize: 18 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#332B1E", marginTop: 10, lineHeight: 1.6 }}>{text}</div>
      <div className="mt-4">
        <SaveButton onClick={onClose}>Понятно</SaveButton>
      </div>
    </Sheet>
  );
}
