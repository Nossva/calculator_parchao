// ===================================================
// Interpolación de Lagrange
// Construye un polinomio que pasa por todos los puntos dados.
// ===================================================

function interpolacionLagrange(xPuntos, yPuntos, xEval) {
  const n = xPuntos.length;

  if (n < 2) {
    return { error: true, message: 'Se necesitan al menos 2 puntos para interpolar.' };
  }
  if (n !== yPuntos.length) {
    return { error: true, message: 'La cantidad de puntos X e Y no coincide.' };
  }

  // Build L_i basis detail and evaluate
  const historial = [];
  let resultado = 0;

  for (let i = 0; i < n; i++) {
    let num = 1;
    let den = 1;
    let termStr = '';

    for (let j = 0; j < n; j++) {
      if (i !== j) {
        if (xEval !== null && xEval !== undefined) {
          num *= (xEval - xPuntos[j]);
        }
        den *= (xPuntos[i] - xPuntos[j]);
        termStr += `(x - ${xPuntos[j].toFixed(4)})`;
      }
    }

    const Li = xEval !== null && xEval !== undefined ? num / den : null;
    const contribucion = Li !== null ? yPuntos[i] * Li : null;
    if (contribucion !== null) resultado += contribucion;

    historial.push({
      i,
      xi: xPuntos[i],
      yi: yPuntos[i],
      Li_expr: `${termStr} / ${den.toFixed(6)}`,
      Li_val: Li,
      contribucion
    });
  }

  // Also compute the polynomial evaluated at many points for graphing
  const xMin = Math.min(...xPuntos) - 0.5;
  const xMax = Math.max(...xPuntos) + 0.5;
  const graphPoints = [];
  const steps = 200;

  for (let s = 0; s <= steps; s++) {
    const xv = xMin + (xMax - xMin) * s / steps;
    let yv = 0;
    for (let i = 0; i < n; i++) {
      let Li = 1;
      for (let j = 0; j < n; j++) {
        if (i !== j) Li *= (xv - xPuntos[j]) / (xPuntos[i] - xPuntos[j]);
      }
      yv += yPuntos[i] * Li;
    }
    graphPoints.push({ x: xv, y: yv });
  }

  return {
    convergio: true,
    resultado,
    xEval,
    grado: n - 1,
    historial,
    graphPoints,
    dataPuntos: xPuntos.map((x, i) => ({ x, y: yPuntos[i] })),
    columns: ['i', 'x_i', 'y_i', 'L_i(x)', 'y_i · L_i(x)'],
    getRow: (h) => [h.i, h.xi, h.yi, h.Li_val, h.contribucion]
  };
}
