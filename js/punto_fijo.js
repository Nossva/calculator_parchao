// ===================================================
// Método de Punto Fijo
// Itera x = g(x) buscando un punto fijo.
// Requiere: parseMathExpr (parser.js)
// ===================================================

function metodoPuntoFijo(gExpr, x0, tol, maxIter) {
  const g = parseMathExpr(gExpr);

  const historial = [];
  let iter = 0;
  let xActual = x0;
  let err = Infinity;
  let convergio = false;
  let divergio = false;
  let motivoError = '';

  while (err > tol && iter < maxIter) {
    let xSig;
    try {
      xSig = g(xActual);
      if (!isFinite(xSig) || isNaN(xSig)) throw new Error('overflow');
    } catch (e) {
      divergio = true;
      motivoError = 'Desbordamiento o valor inválido';
      break;
    }

    err = Math.abs(xSig - xActual);
    historial.push({ iter: iter + 1, x_actual: xActual, g_x: xSig, error: err });

    if (err <= tol) { convergio = true; xActual = xSig; break; }

    xActual = xSig;
    iter++;
  }

  return {
    convergio, divergio, motivoError,
    raiz: convergio ? xActual : null,
    error_final: err,
    iteraciones: historial.length,
    historial,
    columns: ['Iter', 'x_i (actual)', 'g(x_i) (siguiente)', 'Error'],
    getRow: (h) => [h.iter, h.x_actual, h.g_x, h.error]
  };
}
