// §3.1 / §3.2 — persistent, non-dismissible restriction banner. No close
// button, no localStorage-remembered dismissal. This is a policy and
// training control; the app's job is to make the rule impossible to forget.
export function CjiBanner() {
  return (
    <div
      role="alert"
      className="no-print flex-none border-b border-danger/40 bg-danger/10 px-4 py-2 text-sm text-fg"
    >
      <span className="font-semibold text-danger">Restricted:</span>{" "}
      Do not enter NCIC/TCIC/TLETS returns, criminal history, driver license or
      vehicle registration returns, warrant/protective-order hits, or biometric/booking
      data. Do not enter diagnoses, medications, or patient history — chief complaint only.
      This system is not CJIS-covered.
    </div>
  );
}
