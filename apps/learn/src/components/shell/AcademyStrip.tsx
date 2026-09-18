/* Academy strip — where this programme sits on the 5 Circles ladder, and the way back.
   Same recipe as the CIRCLE O.N.E header strip; plain <a> so links leave the /smart basePath. */
export function AcademyStrip() {
  return (
    <div className="lrn-max" style={{ padding: "0 16px" }}>
      <div className="acad">
        <a className="home" href="/">⌂ 5 Circles Academy</a><span className="sep">›</span>
        <span className="on">Stage 1 · Circle S.M.A.R.T</span><span className="sep">›</span>
        <a className="sib" href="/winners/">Stage 2 · Circle W.I.N.N.E.R.S</a><span className="sep">›</span>
        <a className="sib" href="/one/">Stage 3 · Circle O.N.E</a><span className="sep">›</span>
        <span className="soon">Stage 4 · Circle Pro — soon</span>
      </div>
    </div>
  );
}
