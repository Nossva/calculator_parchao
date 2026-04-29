// ===================================================
// Métodos de Integración Numérica
// Trapecio y Simpson 1/3, con comparación de Gauss-Legendre
// ===================================================

// CUADRATURA DE GAUSS-LEGENDRE (5 puntos)
function gaussLegendre5(f, a, b) {
  const nodes = [
    -0.9061798459386640, -0.5384693101056831, 0.0,
     0.5384693101056831, 0.9061798459386640
  ];
  const weights = [
    0.2369268850561891, 0.4786286704993665, 0.5688888888888889,
    0.4786286704993665, 0.2369268850561891
  ];

  const halfRange = (b - a) / 2;
  const midPoint = (a + b) / 2;
  let sum = 0;

  for (let i = 0; i < 5; i++) {
    const x = halfRange * nodes[i] + midPoint;
    sum += weights[i] * f(x);
  }

  return halfRange * sum;
}

// MÉTODO DEL TRAPECIO
function metodoTrapecio(fExpr, a, b, n) {
  const f = parseMathExpr(fExpr);
  if (n < 1) return { error: true, message: 'n debe ser al menos 1.' };

  const h = (b - a) / n;
  const historial = [];
  let suma = 0;

  for (let i = 0; i <= n; i++) {
    const xi = a + i * h;
    const fxi = f(xi);
    let coef = (i === 0 || i === n) ? 1 : 2;
    const aporte = coef * fxi;
    suma += aporte;
    historial.push({ i, xi, fxi, coef, aporte });
  }

  const integral = (h / 2) * suma;

  const graphPoints = [];
  const steps = 200;
  for (let s = 0; s <= steps; s++) {
    const xv = a + (b - a) * s / steps;
    graphPoints.push({ x: xv, y: f(xv) });
  }

  const trapVertices = [];
  for (let i = 0; i <= n; i++) {
    trapVertices.push({ x: a + i * h, y: f(a + i * h) });
  }

  const gaussRef = gaussLegendre5(f, a, b);
  const errorVsGauss = Math.abs(integral - gaussRef);

  return {
    convergio: true, isIntegration: true, metodoIntegracion: 'Trapecio',
    integral, gaussLegendre: gaussRef, errorVsGauss,
    h, n, a, b, historial, graphPoints, trapVertices,
    columns: ['i', 'x_i', 'f(x_i)', 'Coef.', 'Aporte'],
    getRow: (h) => [h.i, h.xi, h.fxi, h.coef, h.aporte]
  };
}

// MÉTODO DE SIMPSON 1/3
function metodoSimpson13(fExpr, a, b, n) {
  const f = parseMathExpr(fExpr);
  if (n < 2) return { error: true, message: 'n debe ser al menos 2.' };
  if (n % 2 !== 0) return { error: true, message: 'n debe ser par para Simpson 1/3.' };

  const h = (b - a) / n;
  const historial = [];
  let suma = 0;

  for (let i = 0; i <= n; i++) {
    const xi = a + i * h;
    const fxi = f(xi);
    let coef;
    if (i === 0 || i === n) coef = 1;
    else if (i % 2 !== 0) coef = 4;
    else coef = 2;
    const aporte = coef * fxi;
    suma += aporte;
    historial.push({ i, xi, fxi, coef, aporte });
  }

  const integral = (h / 3) * suma;

  const graphPoints = [];
  const steps = 200;
  for (let s = 0; s <= steps; s++) {
    const xv = a + (b - a) * s / steps;
    graphPoints.push({ x: xv, y: f(xv) });
  }

  const trapVertices = [];
  for (let i = 0; i <= n; i++) {
    trapVertices.push({ x: a + i * h, y: f(a + i * h) });
  }

  const gaussRef = gaussLegendre5(f, a, b);
  const errorVsGauss = Math.abs(integral - gaussRef);

  return {
    convergio: true, isIntegration: true, metodoIntegracion: 'Simpson 1/3',
    integral, gaussLegendre: gaussRef, errorVsGauss,
    h, n, a, b, historial, graphPoints, trapVertices,
    columns: ['i', 'x_i', 'f(x_i)', 'Coef.', 'Aporte'],
    getRow: (h) => [h.i, h.xi, h.fxi, h.coef, h.aporte]
  };
}
