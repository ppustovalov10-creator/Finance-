"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { ICON_PICK_CHOICES } from "@/lib/categories";
import type { AppState } from "@/lib/types";
import { Sheet, FieldLabel, DescInput, SaveButton, CancelLink, ErrText, SheetTitle } from "./Sheet";
import { Icon } from "./Icon";
import type { Refresh, ShowToast } from "./AppShell";

interface BaseProps {
  show: boolean;
  onClose: () => void;
  state: AppState;
  refresh: Refresh;
  showToast: ShowToast;
}

export function EnvNewModal({ show, onClose, refresh }: BaseProps) {
  const [name, setName] = useState("");
  const [cap, setCap] = useState("");
  const [icon, setIcon] = useState("tag");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setErr("");
    if (!name.trim()) return setErr("Дай конверту название");
    if (cap.trim() !== "") {
      const num = parseFloat(cap);
      if (!num || num < 0) return setErr("Лимит должен быть больше нуля или пустым");
    }
    setBusy(true);
    try {
      await api.createEnvelope({ name: name.trim(), iconKey: icon, cap: cap.trim() !== "" ? parseFloat(cap) : null });
      await refresh();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось создать");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet show={show} onClose={onClose}>
      <SheetTitle>Новый конверт</SheetTitle>
      <FieldLabel>Название</FieldLabel>
      <DescInput placeholder="например, Подарки" value={name} onChange={(e) => setName(e.target.value)} />
      <FieldLabel>Иконка</FieldLabel>
      <div className="flex flex-wrap gap-2 my-1.5">
        {ICON_PICK_CHOICES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setIcon(key)}
            className="w-9 h-9 rounded-[9px] flex items-center justify-center cursor-pointer"
            style={{
              border: `1.5px solid ${icon === key ? "#2F6FED" : "var(--sheet-line)"}`,
              background: icon === key ? "#EAF0FE" : "#fff",
              color: "#332B1E",
            }}
          >
            <Icon name={key} className="w-4 h-4" />
          </button>
        ))}
      </div>
      <FieldLabel>Лимит на неделю, ₽</FieldLabel>
      <DescInput type="number" placeholder="оставь пустым, если без лимита" value={cap} onChange={(e) => setCap(e.target.value)} />
      <ErrText>{err}</ErrText>
      <SaveButton disabled={busy} onClick={save}>
        {busy ? "Создаём…" : "Создать"}
      </SaveButton>
      <CancelLink onClick={onClose}>Отмена</CancelLink>
    </Sheet>
  );
}

export function EnvEditModal({ show, onClose, state, refresh, category }: BaseProps & { category: string | null }) {
  const env = category ? state.envelopes.find((e) => e.category === category) : null;
  const [newName, setNewName] = useState(category || "");
  const [cap, setCap] = useState(env?.weeklyCap != null ? String(env.weeklyCap) : "");
  const [isRegular, setIsRegular] = useState(env ? env.isRegular : true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    if (!category) return;
    setErr("");
    if (!newName.trim()) return setErr("Название не может быть пустым");
    if (cap.trim() !== "") {
      const num = parseFloat(cap);
      if (!num || num < 0) return setErr("Лимит должен быть больше нуля или пустым");
    }
    setBusy(true);
    try {
      await api.updateEnvelope(category, {
        newName: newName.trim(),
        cap: cap.trim() !== "" ? parseFloat(cap) : null,
        isRegular,
      });
      await refresh();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!category) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await api.deleteEnvelope(category);
      await refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet show={show && !!category} onClose={onClose}>
      <SheetTitle>Изменить конверт</SheetTitle>
      <FieldLabel>Название</FieldLabel>
      <DescInput placeholder="Название конверта" value={newName} onChange={(e) => setNewName(e.target.value)} />
      <FieldLabel>Лимит на неделю, ₽</FieldLabel>
      <DescInput type="number" placeholder="оставь пустым, если без лимита" value={cap} onChange={(e) => setCap(e.target.value)} />
      <div style={{ fontSize: "11.5px", color: "#8A8B7E", margin: "-10px 0 12px" }}>
        Пусто — конверт без лимита, просто трекается (например, аренда).
      </div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "12.5px", color: "#332B1E", marginBottom: 14, cursor: "pointer" }}>
        <input type="checkbox" style={{ marginTop: 3 }} checked={isRegular} onChange={(e) => setIsRegular(e.target.checked)} />
        <span>
          Считать в еженедельном плане по зарплате
          <br />
          <span style={{ color: "#8A8B7E", fontSize: 11 }}>
            Выключи, если тратишь тут не каждую неделю (одежда, здоровье и т.п.) — лимит останется, но перестанет
            раздувать сумму &quot;нужно заработать&quot;
          </span>
        </span>
      </label>
      <ErrText>{err}</ErrText>
      <SaveButton disabled={busy} onClick={save}>
        Сохранить
      </SaveButton>
      <CancelLink danger onClick={del}>
        {confirmDelete ? "Точно удалить? Нажми ещё раз" : "Удалить конверт"}
      </CancelLink>
      <CancelLink onClick={onClose}>Отмена</CancelLink>
    </Sheet>
  );
}

export function RulesModal({ show, onClose, state, refresh }: BaseProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const cats = [...new Set([...state.categories, ...Object.keys(state.customKeywords)])];

  async function add(cat: string) {
    const val = (inputs[cat] || "").trim().toLowerCase();
    if (!val) return;
    await api.addKeyword(cat, val);
    setInputs((s) => ({ ...s, [cat]: "" }));
    await refresh();
  }

  async function remove(cat: string, kw: string) {
    await api.removeKeyword(cat, kw);
    await refresh();
  }

  return (
    <Sheet show={show} onClose={onClose}>
      <SheetTitle>Правила распознавания</SheetTitle>
      <div style={{ fontSize: 12, color: "#8A8B7E", marginTop: 4 }}>
        Если в описании траты встретится такое слово — она сама попадёт в этот конверт. Нажми на слово, чтобы удалить его.
      </div>
      <div style={{ maxHeight: 340, overflowY: "auto", marginTop: 14 }}>
        {cats.map((cat) => {
          const kws = state.customKeywords[cat] || [];
          return (
            <div key={cat} className="mb-4">
              <div className="font-display font-semibold text-sm mb-1.5" style={{ color: "#332B1E" }}>
                {cat}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {kws.length === 0 && (
                  <span style={{ fontSize: "11.5px", color: "#8A8B7E" }}>пока пусто</span>
                )}
                {kws.map((kw) => (
                  <span
                    key={kw}
                    onClick={() => remove(cat, kw)}
                    className="cursor-pointer inline-flex items-center gap-1 rounded-full text-xs px-2.5 py-1"
                    style={{ background: "#F0EEE6", border: "1px solid #E5DCC5", color: "#332B1E" }}
                  >
                    {kw} ✕
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="+ добавить слово, Enter"
                className="w-full px-2.5 py-2 rounded-lg text-[13px]"
                style={{ border: "1px solid #E5DCC5" }}
                value={inputs[cat] || ""}
                onChange={(e) => setInputs((s) => ({ ...s, [cat]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add(cat);
                }}
              />
            </div>
          );
        })}
      </div>
      <SaveButton onClick={onClose}>Готово</SaveButton>
    </Sheet>
  );
}
