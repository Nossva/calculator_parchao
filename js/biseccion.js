// ===================================================
// Método de Bisección
// Encuentra raíces dividiendo intervalos sucesivamente.
// Requiere: parseMathExpr (parser.js)
// ===================================================

function metodoBiseccion(fExpr, a, b, tol, maxIter) {
  const f = parseMathExpr(fExpr);
  const fa = f(a);
  const fb = f(b);

  if (fa * fb >= 0) {
    return { error: true, message: 'f(a) y f(b) deben tener signos opuestos. El intervalo no contiene una raíz garantizada.' };
  }

  const historial = [];
  let iter = 0;
  let err = Math.abs(b - a) / 2.0;
  let c = a;
  let fc = fa;

  while (err > tol && iter < maxIter) {
    c = (a + b) / 2.0;
    fc = f(c);

    historial.push({ iter: iter + 1, a, b, c, fc, error: err });

    if (fc === 0) { err = 0; break; }

    if (fa * fc < 0 ? f(a) * fc < 0 : false) {
      b = c;
    } else if (f(a) * fc < 0) {
      b = c;
    } else {
      a = c;
    }

    err = Math.abs(b - a) / 2.0;
    iter++;
  }

  const convergio = err <= tol || fc === 0;

  return {
    convergio,
    raiz: c,
    error_final: err,
    f_raiz: fc,
    iteraciones: iter,
    historial,
    columns: ['Iter', 'a', 'b', 'c', 'f(c)', 'Error'],
    getRow: (h) => [h.iter, h.a, h.b, h.c, h.fc, h.error]
  };
}
