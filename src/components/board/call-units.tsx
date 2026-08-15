"use client";

import { useEffect, useRef, useState } from "react";
import { useBoardContext } from "./board-context";
import { Combobox } from "@/components/ui/combobox";
import { TimeStampButton } from "@/components/ui/time-stamp-button";
import {
  addUnitAction,
  stampUnitTimeAction,
  updateUnitAssignmentAction,
  type UnitTimeField,
} from "@/app/outage/[id]/calls-actions";
import type { UnitAssignment } from "@/lib/types";

export function CallUnits({
  outageId,
  callId,
  receivedAt,
  assignments,
  disabled,
}: {
  outageId: string;
  callId: string;
  receivedAt: string;
  assignments: UnitAssignment[];
  disabled: boolean;
}) {
  const { units, lookupsByCategory } = useBoardContext();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const assignedIds = new Set(assignments.map((a) => a.unit_id));
  const unitOptions = units
    .filter((u) => !assignedIds.has(u.id))
    .map((u) => ({ value: u.id, label: `${u.id} (${u.agency}${u.unit_type ? " " + u.unit_type : ""})` }));

  useEffect(() => {
    function onAddUnit() {
      if (!disabled) setPickerOpen(true);
    }
    window.addEventListener("board:add-unit", onAddUnit);
    return () => window.removeEventListener("board:add-unit", onAddUnit);
  }, [disabled]);

  async function handleAdd() {
    if (!selectedUnit) return;
    await addUnitAction(outageId, callId, selectedUnit);
    setSelectedUnit(null);
    setPickerOpen(false);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Units ({assignments.length})
        </h3>
        {!disabled ? (
          <button
            ref={addButtonRef}
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="rounded border border-border-strong px-2 py-1 text-xs text-fg-muted hover:text-fg"
          >
            + Add unit (U)
          </button>
        ) : null}
      </div>

      {pickerOpen ? (
        <div className="mb-3 flex items-end gap-2 rounded border border-border bg-surface p-2">
          <div className="flex-1">
            <Combobox label="Unit" value={selectedUnit} onChange={setSelectedUnit} options={unitOptions} />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedUnit}
            className="rounded bg-accent px-3 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            Add
          </button>
        </div>
      ) : null}

      <div className="space-y-3">
        {assignments.map((a) => (
          <UnitAssignmentCard
            key={a.id}
            outageId={outageId}
            callId={callId}
            receivedAt={receivedAt}
            assignment={a}
            dispositionOptions={lookupsByCategory.unit_disposition ?? []}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

function UnitAssignmentCard({
  outageId,
  callId,
  receivedAt,
  assignment,
  dispositionOptions,
  disabled,
}: {
  outageId: string;
  callId: string;
  receivedAt: string;
  assignment: UnitAssignment;
  dispositionOptions: { value: string }[];
  disabled: boolean;
}) {
  const [personnel, setPersonnel] = useState(assignment.personnel ?? "");
  const [disposition, setDisposition] = useState<string | null>(assignment.unit_disposition);

  function stamp(field: UnitTimeField) {
    void stampUnitTimeAction(outageId, callId, assignment.id, field);
  }
  function manual(field: UnitTimeField, iso: string) {
    void stampUnitTimeAction(outageId, callId, assignment.id, field, iso);
  }

  return (
    <div className="rounded border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono-nums text-lg font-bold text-fg">{assignment.unit_id}</span>
        <input
          value={personnel}
          onChange={(e) => setPersonnel(e.target.value)}
          onBlur={() =>
            updateUnitAssignmentAction(outageId, callId, assignment.id, { personnel: personnel || null })
          }
          placeholder="Personnel"
          disabled={disabled}
          className="rounded border border-border-strong bg-surface-raised px-2 py-1 text-sm text-fg outline-none disabled:opacity-60"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TimeStampButton label="Dispatched" value={assignment.dispatched_at} anchorIso={receivedAt} onStamp={() => stamp("dispatched_at")} onManualSet={(iso) => manual("dispatched_at", iso)} disabled={disabled} />
        <TimeStampButton label="Enroute" value={assignment.enroute_at} anchorIso={receivedAt} onStamp={() => stamp("enroute_at")} onManualSet={(iso) => manual("enroute_at", iso)} disabled={disabled} />
        <TimeStampButton label="On scene" value={assignment.on_scene_at} anchorIso={receivedAt} onStamp={() => stamp("on_scene_at")} onManualSet={(iso) => manual("on_scene_at", iso)} disabled={disabled} />
        <TimeStampButton label="Transporting" value={assignment.transporting_at} anchorIso={receivedAt} onStamp={() => stamp("transporting_at")} onManualSet={(iso) => manual("transporting_at", iso)} disabled={disabled} />
        <TimeStampButton label="At destination" value={assignment.at_destination_at} anchorIso={receivedAt} onStamp={() => stamp("at_destination_at")} onManualSet={(iso) => manual("at_destination_at", iso)} disabled={disabled} />
        <TimeStampButton label="Cleared" value={assignment.cleared_at} anchorIso={receivedAt} onStamp={() => stamp("cleared_at")} onManualSet={(iso) => manual("cleared_at", iso)} disabled={disabled} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <Combobox
          label="Disposition"
          value={disposition}
          onChange={(v) => {
            setDisposition(v);
            void updateUnitAssignmentAction(outageId, callId, assignment.id, { unit_disposition: v });
          }}
          options={dispositionOptions.map((d) => ({ value: d.value, label: d.value }))}
        />
        <OdometerField
          label="Odometer start"
          value={assignment.odometer_start}
          onSet={(v) => updateUnitAssignmentAction(outageId, callId, assignment.id, { odometer_start: v })}
          disabled={disabled}
        />
        <OdometerField
          label="Odometer end"
          value={assignment.odometer_end}
          onSet={(v) => updateUnitAssignmentAction(outageId, callId, assignment.id, { odometer_end: v })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function OdometerField({
  label,
  value,
  onSet,
  disabled,
}: {
  label: string;
  value: number | null;
  onSet: (v: number | null) => void;
  disabled: boolean;
}) {
  const [local, setLocal] = useState(value?.toString() ?? "");
  return (
    <div>
      <label className="mb-1 block text-xs text-fg-muted">{label}</label>
      <input
        inputMode="numeric"
        value={local}
        onChange={(e) => setLocal(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={() => onSet(local ? Number(local) : null)}
        disabled={disabled}
        className="w-full rounded border border-border-strong bg-surface-raised px-2 py-1 font-mono-nums text-sm text-fg outline-none disabled:opacity-60"
      />
    </div>
  );
}
