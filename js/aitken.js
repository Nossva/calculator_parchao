// ===================================================
// Aceleración de Aitken (Δ²)
// Acelera la convergencia del método de punto fijo.
// Requiere: parseMathExpr (parser.js)
// ===================================================

function aceleracionAitken(gExpr, x0, tol, maxIter) {
  const g = parseMathExpr(gExpr);

  const historial = [];
  let iter = 0;
  let p0 = x0;
  let err = Infinity;
  let convergio = false;
  let divergio = false;
  let pAitken = p0;

  while (err > tol && iter < maxIter) {
    let p1, p2;
    try {
      p1 = g(p0);
      if (!isFinite(p1) || isNaN(p1)) throw new Error('overflow');

      p2 = g(p1);
      if (!isFinite(p2) || isNaN(p2)) throw new Error('overflow');

      const denom = p2 - 2 * p1 + p0;

      if (denom === 0) {
        pAitken = p2;
        err = 0;
        convergio = true;
      } else {
        pAitken = p0 - ((p1 - p0) ** 2) / denom;
        err = Math.abs(pAitken - p0);
      }
    } catch (e) {
      divergio = true;
      break;
    }

    historial.push({ iter: iter + 1, p0, p1, p2, pAitken, error: err });

    if (err <= tol || convergio) { convergio = true; p0 = pAitken; break; }

    p0 = pAitken;
    iter++;
  }

  return {
    convergio, divergio,
    raiz: !divergio ? pAitken : null,
    error_final: err,
    iteraciones: historial.length,
    historial,
    columns: ['Iter', 'p0', 'p1 = g(p0)', 'p2 = g(p1)', 'p_aitken', 'Error'],
    getRow: (h) => [h.iter, h.p0, h.p1, h.p2, h.pAitken, h.error]
  };
}
