// ===================================================
// Método de Newton-Raphson
// Usa la derivada para converger rápidamente a la raíz.
// Requiere: parseMathExpr (parser.js)
// ===================================================

function metodoNewtonRaphson(fExpr, dfExpr, x0, tol, maxIter) {
  const f = parseMathExpr(fExpr);
  const df = parseMathExpr(dfExpr);

  const historial = [];
  let iter = 0;
  let xActual = x0;
  let err = Infinity;
  let convergio = false;
  let divergio = false;
  let errorDerivada = false;

  while (err > tol && iter < maxIter) {
    let fx, dfx, xSig;
    try {
      fx = f(xActual);
      dfx = df(xActual);

      if (dfx === 0) { errorDerivada = true; break; }

      xSig = xActual - (fx / dfx);

      if (!isFinite(xSig) || isNaN(xSig)) throw new Error('overflow');
    } catch (e) {
      if (errorDerivada) break;
      divergio = true;
      break;
    }

    err = Math.abs(xSig - xActual);
    historial.push({ iter: iter + 1, x_i: xActual, fx, dfx, x_sig: xSig, error: err });

    if (err <= tol || fx === 0) { convergio = true; xActual = xSig; break; }

    xActual = xSig;
    iter++;
  }

  return {
    convergio, divergio, errorDerivada,
    raiz: (convergio || iter > 0) && !errorDerivada ? xActual : null,
    error_final: err,
    iteraciones: historial.length,
    historial,
    columns: ['Iter', 'x_i', 'f(x_i)', "f'(x_i)", 'x_i+1', 'Error'],
    getRow: (h) => [h.iter, h.x_i, h.fx, h.dfx, h.x_sig, h.error]
  };
}
