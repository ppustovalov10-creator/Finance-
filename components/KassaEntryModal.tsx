"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { ddmmyyyyToIso, isoToDDMMYYYY } from "@/lib/date";
import type { KassaEntry } from "@/lib/kassa";
import { Sheet, FieldLabel, AmountInput, DescInput, SaveButton, CancelLink, ErrText, SheetTitle } from "./Sheet";

export function KassaEntryModal({
  show,
  onClose,
  onSaved,
  entry,
  defaultDate,
}: {
  show: boolean;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
  entry: KassaEntry | null;
  defaultDate: string | null;
}) {
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [dateIso, setDateIso] = useState(
    entry ? ddmmyyyyToIso(entry.date) : defaultDate ? ddmmyyyyToIso(defaultDate) : new Date().toISOString().slice(0, 10)
  );
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setErr("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setErr("Сумма должна быть больше нуля");
      return;
    }
    setBusy(true);
    try {
      const dateStr = isoToDDMMYYYY(dateIso);
      if (entry) {
        await api.updateKassaEntry(entry.id, { amount: amt, dateStr });
      } else {
        await api.addKassaEntry({ amount: amt, dateStr });
      }
      await onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!entry) return;
    setBusy(true);
    try {
      await api.deleteKassaEntry(entry.id);
      await onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet show={show} onClose={onClose}>
      <SheetTitle>{entry ? "Изменить кассу" : "Внести кассу за день"}</SheetTitle>
      <FieldLabel first>Сумма</FieldLabel>
      <AmountInput style={{ fontSize: 44 }} value={amount} onChange={(e) => setAmount(e.target.value)} />
      <div style={{ textAlign: "center", color: "#8A8B7E", fontSize: 12, marginBottom: 20 }}>₽</div>
      <FieldLabel>Дата</FieldLabel>
      <DescInput type="date" value={dateIso} onChange={(e) => setDateIso(e.target.value)} />
      <ErrText>{err}</ErrText>
      <SaveButton disabled={busy} onClick={save}>
        {busy ? "Сохраняем…" : "Сохранить"}
      </SaveButton>
      {entry && (
        <CancelLink danger onClick={del}>
          Удалить запись
        </CancelLink>
      )}
      <CancelLink onClick={onClose}>Отмена</CancelLink>
    </Sheet>
  );
}
