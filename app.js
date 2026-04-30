// ===================================================
// SISTEMA INTEGRADO - MÉTODOS DE ESTIMACIÓN
// Reimplementación de los 5 métodos numéricos en JS
// ===================================================

// --- Safe Math Parser ---
function parseMathExpr(expr) {
  // Sanitize and transform math expression string into JS-evaluable function
  let sanitized = expr
    .replace(/\^/g, '**')
    .replace(/sen\(/gi, 'Math.sin(')
    .replace(/cos\(/gi, 'Math.cos(')
    .replace(/tan\(/gi, 'Math.tan(')
    .replace(/sin\(/gi, 'Math.sin(')
    .replace(/cbrt\(/gi, 'Math.cbrt(')
    .replace(/sqrt\(/gi, 'Math.sqrt(')  //raiz cubica
    .replace(/log\(/gi, 'Math.log(')
    .replace(/ln\(/gi, 'Math.log(')
    .replace(/log10\(/gi, 'Math.log10(')
    .replace(/abs\(/gi, 'Math.abs(')
    .replace(/exp\(/gi, 'Math.exp(')
    .replace(/pi/gi, 'Math.PI')
    .replace(/(?<![a-zA-Z])e(?![a-zA-Z\d\(])/g, 'Math.E');

  try {
    return new Function('x', `"use strict"; return (${sanitized});`);
  } catch (e) {
    throw new Error(`Expresión inválida: ${expr}`);
  }
}

// ============================================
// 1. MÉTODO DE BISECCIÓN
// ============================================
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

// ============================================
// 2. MÉTODO DE PUNTO FIJO
// ============================================
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

// ============================================
// 3. MÉTODO DE NEWTON-RAPHSON
// ============================================
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

// ============================================
// 4. ACELERACIÓN DE AITKEN
// ============================================
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

// ============================================
// 5. INTERPOLACIÓN DE LAGRANGE
// ============================================

// Multiplies two coefficient arrays (polynomial multiplication)
function polyMul(a, b) {
  const result = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++)
      result[i + j] += a[i] * b[j];
  return result;
}

// Returns the coefficients [c0, c1, c2, ...] of the Lagrange polynomial
// where P(x) = c0 + c1*x + c2*x^2 + ...
function lagrangeCoeficients(xPuntos, yPuntos) {
  const n = xPuntos.length;
  let poly = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    // Build numerator polynomial for L_i: product of (x - x_j) for j != i
    let num = [1];
    let den = 1;
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        num = polyMul(num, [-xPuntos[j], 1]); // (x - x_j)
        den *= (xPuntos[i] - xPuntos[j]);
      }
    }
    for (let k = 0; k < poly.length; k++)
      poly[k] += yPuntos[i] * (num[k] || 0) / den;
  }
  return poly;
}

// Formats a coefficient array as a readable polynomial string
// Converts a decimal to a fraction string like "7/6" using the Stern-Brocot / Euclidean approach
function toFraction(value, maxDen = 10000) {
  if (Math.abs(value) < 1e-9) return '0';
  const negative = value < 0;
  let x = Math.abs(value);

  // Find best rational approximation via continued fractions
  let bestNum = 1, bestDen = 1, bestErr = Infinity;
  let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
  let rem = x;
  for (let i = 0; i < 50; i++) {
    const a = Math.floor(rem);
    const h = a * h1 + h2;
    const k = a * k1 + k2;
    if (k > maxDen) break;
    const err = Math.abs(x - h / k);
    if (err < bestErr) { bestErr = err; bestNum = h; bestDen = k; }
    if (err < 1e-9) break;
    h2 = h1; h1 = h;
    k2 = k1; k1 = k;
    rem = 1 / (rem - a);
    if (!isFinite(rem)) break;
  }

  const sign = negative ? '-' : '';
  if (bestDen === 1) return `${sign}${bestNum}`;
  return `${sign}${bestNum}/${bestDen}`;
}

function formatPolinomioFracciones(coefs) {
  const terms = [];
  for (let i = coefs.length - 1; i >= 0; i--) {
    const c = parseFloat(coefs[i].toFixed(9));
    if (Math.abs(c) < 1e-9) continue;

    const cAbs = Math.abs(c);
    const frac = toFraction(cAbs);
    const sign = c < 0 ? ' - ' : (terms.length > 0 ? ' + ' : '');
    // If coefficient is 1 and there's a variable part, omit the "1"
    const cStr = (frac === '1' && i > 0) ? '' : frac;

    let term;
    if (i === 0) term = frac;
    else if (i === 1) term = `${cStr}x`;
    else term = `${cStr}x^${i}`;

    terms.push(`${sign}${term}`);
  }
  return terms.length ? terms.join('') : '0';
}

function formatPolinomio(coefs) {
  const terms = [];
  for (let i = coefs.length - 1; i >= 0; i--) {
    const c = parseFloat(coefs[i].toFixed(6));
    if (Math.abs(c) < 1e-9) continue;

    const cAbs = Math.abs(c);
    const sign = c < 0 ? ' - ' : (terms.length > 0 ? ' + ' : '');
    const cStr = cAbs === 1 && i > 0 ? '' : String(parseFloat(cAbs.toFixed(6)));

    let term;
    if (i === 0) term = String(parseFloat(cAbs.toFixed(6)));
    else if (i === 1) term = `${cStr}x`;
    else term = `${cStr}x^${i}`;

    terms.push(`${sign}${term}`);
  }
  return terms.length ? terms.join('') : '0';
}

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

  const coefs = lagrangeCoeficients(xPuntos, yPuntos);
  const polinomio = formatPolinomio(coefs);
  const polinomioFracciones = formatPolinomioFracciones(coefs);

  return {
    convergio: true,
    resultado,
    xEval,
    grado: n - 1,
    polinomio,
    polinomioFracciones,
    historial,
    graphPoints,
    dataPuntos: xPuntos.map((x, i) => ({ x, y: yPuntos[i] })),
    columns: ['i', 'x_i', 'y_i', 'L_i(x)', 'y_i · L_i(x)'],
    getRow: (h) => [h.i, h.xi, h.yi, h.Li_val, h.contribucion]
  };
}

// ============================================
// CUADRATURA DE GAUSS-LEGENDRE (5 puntos)
// Para comparación de referencia
// ============================================
function gaussLegendre5(f, a, b) {
  // 5-point Gauss-Legendre nodes and weights on [-1, 1]
  const nodes = [
    -0.9061798459386640,
    -0.5384693101056831,
     0.0,
     0.5384693101056831,
     0.9061798459386640
  ];
  const weights = [
    0.2369268850561891,
    0.4786286704993665,
    0.5688888888888889,
    0.4786286704993665,
    0.2369268850561891
  ];

  // Transform from [-1,1] to [a,b]: x = (b-a)/2 * t + (a+b)/2
  const halfRange = (b - a) / 2;
  const midPoint = (a + b) / 2;
  let sum = 0;

  for (let i = 0; i < 5; i++) {
    const x = halfRange * nodes[i] + midPoint;
    sum += weights[i] * f(x);
  }

  return halfRange * sum;
}

// ============================================
// 6. MÉTODO DEL TRAPECIO
// ============================================
function metodoTrapecio(fExpr, a, b, n) {
  const f = parseMathExpr(fExpr);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { error: true, message: 'Los límites a y b deben ser valores numéricos válidos (ej: 0, pi, pi/2).' };
  }
  if (n < 1) return { error: true, message: 'n debe ser al menos 1.' };

  const h = (b - a) / n;
  const historial = [];
  let suma = 0;

  for (let i = 0; i <= n; i++) {
    const xi = a + i * h;
    const fxi = f(xi);
    let coef = 1;
    if (i === 0 || i === n) coef = 1;
    else coef = 2;
    const aporte = coef * fxi;
    suma += aporte;
    historial.push({ i, xi, fxi, coef, aporte });
  }

  const integral = (h / 2) * suma;

  // Graph data
  const graphPoints = [];
  const steps = 200;
  for (let s = 0; s <= steps; s++) {
    const xv = a + (b - a) * s / steps;
    graphPoints.push({ x: xv, y: f(xv) });
  }

  // Trapezoid vertices for shading
  const trapVertices = [];
  for (let i = 0; i <= n; i++) {
    trapVertices.push({ x: a + i * h, y: f(a + i * h) });
  }

  // Gauss-Legendre reference
  const gaussRef = gaussLegendre5(f, a, b);
  const errorVsGauss = Math.abs(integral - gaussRef);

  return {
    convergio: true,
    isIntegration: true,
    metodoIntegracion: 'Trapecio',
    integral,
    gaussLegendre: gaussRef,
    errorVsGauss,
    h,
    n,
    a, b,
    historial,
    graphPoints,
    trapVertices,
    columns: ['i', 'x_i', 'f(x_i)', 'Coef.', 'Aporte'],
    getRow: (h) => [h.i, h.xi, h.fxi, h.coef, h.aporte]
  };
}

// ============================================
// REGLA DEL RECTÁNGULO (MEDIO)
// ============================================
function metodoRectangulo(fExpr, a, b, n) {
  const f = parseMathExpr(fExpr);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { error: true, message: 'Los límites a y b deben ser valores numéricos válidos (ej: 0, pi, pi/2).' };
  }
  if (n < 1) return { error: true, message: 'n debe ser al menos 1.' };

  const h = (b - a) / n;
  const historial = [];
  let suma = 0;

  for (let i = 0; i < n; i++) {
    // midpoint of subinterval [a + i*h, a + (i+1)*h]
    const xi = a + (i + 0.5) * h;
    const fxi = f(xi);
    const aporte = fxi * h;
    suma += fxi;
    historial.push({ i, xi, fxi, aporte });
  }

  const integral = h * suma;

  // Graph data
  const graphPoints = [];
  const steps = 200;
  for (let s = 0; s <= steps; s++) {
    const xv = a + (b - a) * s / steps;
    graphPoints.push({ x: xv, y: f(xv) });
  }

  // Rectangle sample points (for visualizing midpoints)
  const rectPoints = [];
  for (let i = 0; i < n; i++) {
    rectPoints.push({ x: a + (i + 0.5) * h, y: f(a + (i + 0.5) * h) });
  }

  const gaussRef = gaussLegendre5(f, a, b);
  const errorVsGauss = Math.abs(integral - gaussRef);

  return {
    convergio: true,
    isIntegration: true,
    metodoIntegracion: 'Rectángulo (Medio)',
    integral,
    gaussLegendre: gaussRef,
    errorVsGauss,
    h,
    n,
    a, b,
    historial,
    graphPoints,
    rectPoints,
    columns: ['i', 'x_i(mid)', 'f(x_i)', 'Aporte'],
    getRow: (h) => [h.i, h.xi, h.fxi, h.aporte]
  };
}

// ============================================
// REGLA DEL RECTÁNGULO (IZQUIERDO)
// ============================================
function metodoRectanguloIzquierdo(fExpr, a, b, n) {
  const f = parseMathExpr(fExpr);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { error: true, message: 'Los límites a y b deben ser valores numéricos válidos (ej: 0, pi, pi/2).' };
  }
  if (n < 1) return { error: true, message: 'n debe ser al menos 1.' };

  const h = (b - a) / n;
  const historial = [];
  let suma = 0;

  for (let i = 0; i < n; i++) {
    // left endpoint of subinterval [a + i*h, a + (i+1)*h]
    const xi = a + i * h;
    const fxi = f(xi);
    const aporte = fxi * h;
    suma += fxi;
    historial.push({ i, xi, fxi, aporte });
  }

  const integral = h * suma;

  const graphPoints = [];
  const steps = 200;
  for (let s = 0; s <= steps; s++) {
    const xv = a + (b - a) * s / steps;
    graphPoints.push({ x: xv, y: f(xv) });
  }

  const leftPoints = [];
  for (let i = 0; i < n; i++) {
    leftPoints.push({ x: a + i * h, y: f(a + i * h) });
  }

  const gaussRef = gaussLegendre5(f, a, b);
  const errorVsGauss = Math.abs(integral - gaussRef);

  return {
    convergio: true,
    isIntegration: true,
    metodoIntegracion: 'Rectángulo (Izquierdo)',
    integral,
    gaussLegendre: gaussRef,
    errorVsGauss,
    h,
    n,
    a, b,
    historial,
    graphPoints,
    leftPoints,
    columns: ['i', 'x_i(left)', 'f(x_i)', 'Aporte'],
    getRow: (h) => [h.i, h.xi, h.fxi, h.aporte]
  };
}

// ============================================
// 7. MÉTODO DE SIMPSON 1/3
// ============================================
function metodoSimpson13(fExpr, a, b, n) {
  const f = parseMathExpr(fExpr);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { error: true, message: 'Los límites a y b deben ser valores numéricos válidos (ej: 0, pi, pi/2).' };
  }
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

  // Graph data
  const graphPoints = [];
  const steps = 200;
  for (let s = 0; s <= steps; s++) {
    const xv = a + (b - a) * s / steps;
    graphPoints.push({ x: xv, y: f(xv) });
  }

  // Subinterval points for shading
  const trapVertices = [];
  for (let i = 0; i <= n; i++) {
    trapVertices.push({ x: a + i * h, y: f(a + i * h) });
  }

  // Gauss-Legendre reference
  const gaussRef = gaussLegendre5(f, a, b);
  const errorVsGauss = Math.abs(integral - gaussRef);

  return {
    convergio: true,
    isIntegration: true,
    metodoIntegracion: 'Simpson 1/3',
    integral,
    gaussLegendre: gaussRef,
    errorVsGauss,
    h,
    n,
    a, b,
    historial,
    graphPoints,
    trapVertices,
    columns: ['i', 'x_i', 'f(x_i)', 'Coef.', 'Aporte'],
    getRow: (h) => [h.i, h.xi, h.fxi, h.coef, h.aporte]
  };
}

function metodoSimpson38(fExpr, a, b, n) {
  const f = parseMathExpr(fExpr);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { error: true, message: 'Los límites a y b deben ser valores numéricos válidos (ej: 0, pi, pi/2).' };
  }
  if (n < 3) return { error: true, message: 'n debe ser al menos 3 para Simpson 3/8.' };
  if (n % 3 !== 0) return { error: true, message: 'n debe ser múltiplo de 3 para Simpson 3/8.' };

  const h = (b - a) / n;
  const historial = [];
  let suma = 0;

  for (let i = 0; i <= n; i++) {
    const xi = a + i * h;
    const fxi = f(xi);
    let coef;
    if (i === 0 || i === n) coef = 1;
    else if (i % 3 === 0) coef = 2;
    else coef = 3;
    const aporte = coef * fxi;
    suma += aporte;
    historial.push({ i, xi, fxi, coef, aporte });
  }

  const integral = (3 * h / 8) * suma;

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
    convergio: true,
    isIntegration: true,
    metodoIntegracion: 'Simpson 3/8',
    integral,
    gaussLegendre: gaussRef,
    errorVsGauss,
    h,
    n,
    a, b,
    historial,
    graphPoints,
    trapVertices,
    columns: ['i', 'x_i', 'f(x_i)', 'Coef.', 'Aporte'],
    getRow: (h) => [h.i, h.xi, h.fxi, h.coef, h.aporte]
  };
}

// ============================================
// MÉTODO DE MONTE CARLO
// ============================================
function metodoMonteCarloIntegracion(fExpr, a, b, nMuestras) {
  const f = parseMathExpr(fExpr);

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { error: true, message: 'Los límites a y b deben ser valores numéricos válidos (ej: 0, pi, pi/2).' };
  }

  if (a >= b) {
    return { error: true, message: 'a debe ser menor que b' };
  }
  if (nMuestras < 1) {
    return { error: true, message: 'nMuestras debe ser al menos 1' };
  }

  // Generar puntos aleatorios en el intervalo [a, b]
  const xAleatorios = [];
  const fValores = [];
  
  for (let i = 0; i < nMuestras; i++) {
    const x = a + Math.random() * (b - a);
    const fx = f(x);
    xAleatorios.push(x);
    fValores.push(fx);
  }

  // Calcular estadísticas
  const longitudIntervalo = b - a;
  const sumaF = fValores.reduce((sum, val) => sum + val, 0);
  const promedioF = sumaF / nMuestras;
  const integralEstimada = longitudIntervalo * promedioF;

  const fMin = Math.min(...fValores);
  const fMax = Math.max(...fValores);
  
  // Desviación estándar
  const varianza = fValores.reduce((sum, val) => sum + Math.pow(val - promedioF, 2), 0) / nMuestras;
  const desvStd = Math.sqrt(varianza);

  // Historial de muestras (primeras 10 y últimas 10)
  const historial = [];
  const muestrasAMostrar = Math.min(10, nMuestras);

  for (let i = 0; i < muestrasAMostrar; i++) {
    historial.push({
      muestra: i + 1,
      x: xAleatorios[i],
      fx: fValores[i]
    });
  }

  if (nMuestras > 20) {
    historial.push({
      muestra: '...',
      x: '...',
      fx: '...'
    });
  }

  for (let i = Math.max(muestrasAMostrar, nMuestras - muestrasAMostrar); i < nMuestras; i++) {
    historial.push({
      muestra: i + 1,
      x: xAleatorios[i],
      fx: fValores[i]
    });
  }

  // Graph data
  const graphPoints = [];
  const steps = 200;
  for (let s = 0; s <= steps; s++) {
    const xv = a + (b - a) * s / steps;
    graphPoints.push({ x: xv, y: f(xv) });
  }

  return {
    convergio: true,
    isIntegration: true,
    metodoIntegracion: 'Monte Carlo',
    integral: integralEstimada,
    nMuestras: nMuestras,
    intervalo: { a, b },
    longitudIntervalo: longitudIntervalo,
    historial: historial,
    estadisticas: {
      fMin: fMin,
      fMax: fMax,
      fPromedio: promedioF,
      desvStd: desvStd
    },
    graphPoints: graphPoints,
    columns: ['Muestra', 'x', 'f(x)'],
    getRow: (h) => {
      if (h.muestra === '...') return ['...', '...', '...'];
      return [h.muestra, h.x.toFixed(6), h.fx.toFixed(6)];
    }
  };
}

// Aproximación de π usando Monte Carlo
function aproximarPi(nPuntos) {
  if (nPuntos < 1) {
    return { error: true, message: 'nPuntos debe ser al menos 1' };
  }

  let puntosDestro = 0;

  // Generar puntos aleatorios y contar los que caen dentro del círculo
  for (let i = 0; i < nPuntos; i++) {
    const x = Math.random();
    const y = Math.random();
    const distancia = Math.sqrt(x * x + y * y);

    if (distancia <= 1) {
      puntosDestro++;
    }
  }

  // π ≈ 4 * (puntos_dentro / puntos_totales)
  const piAproximado = 4 * puntosDestro / nPuntos;
  const piReal = Math.PI;
  const error = Math.abs(piAproximado - piReal);
  const porcentajeError = (error / piReal) * 100;

  return {
    convergio: true,
    isPiAproximation: true,
    piAproximado: piAproximado,
    piReal: piReal,
    nPuntos: nPuntos,
    puntosDestro: puntosDestro,
    puntosAfuera: nPuntos - puntosDestro,
    razonDestro: puntosDestro / nPuntos,
    errorAbsoluto: error,
    errorPorcentaje: porcentajeError
  };
}

// ============================================
// UI CONTROLLER
// ============================================
const METHODS = {
  biseccion: {
    name: 'Bisección',
    description: 'Encuentra raíces dividiendo intervalos sucesivamente.',
    fields: [
      { id: 'f_expr', label: 'Función f(x)', placeholder: 'x^4 - 2*x^3 - 4*x^2 + 4*x + 4', hint: 'Usa: ^, sqrt(), sin(), cos(), pi, e', fullWidth: true },
      { id: 'a', label: 'Extremo a', placeholder: '-2', type: 'number' },
      { id: 'b', label: 'Extremo b', placeholder: '-1', type: 'number' },
      { id: 'tol', label: 'Tolerancia', placeholder: '0.001', type: 'number' },
      { id: 'max_iter', label: 'Máx. Iteraciones', placeholder: '100', type: 'number' },
    ],
    run: (v) => metodoBiseccion(v.f_expr, parseFloat(v.a), parseFloat(v.b), parseFloat(v.tol), parseInt(v.max_iter))
  },
  punto_fijo: {
    name: 'Punto Fijo',
    description: 'Itera x = g(x) buscando un punto fijo.',
    fields: [
      { id: 'g_expr', label: 'Función g(x)', placeholder: '(5/(x^2)) + 2', hint: 'Reescribir f(x)=0 como x = g(x)', fullWidth: true },
      { id: 'x0', label: 'Valor inicial x₀', placeholder: '1', type: 'number' },
      { id: 'tol', label: 'Tolerancia', placeholder: '0.001', type: 'number' },
      { id: 'max_iter', label: 'Máx. Iteraciones', placeholder: '20', type: 'number' },
    ],
    run: (v) => metodoPuntoFijo(v.g_expr, parseFloat(v.x0), parseFloat(v.tol), parseInt(v.max_iter))
  },
  newton_raphson: {
    name: 'Newton-Raphson',
    description: 'Usa la derivada para converger rápidamente a la raíz.',
    fields: [
      { id: 'f_expr', label: 'Función f(x)', placeholder: 'x^3 - x - 2', hint: 'La función original', fullWidth: true },
      { id: 'df_expr', label: "Derivada f'(x)", placeholder: '3*x^2 - 1', hint: 'Derivada analítica', fullWidth: true },
      { id: 'x0', label: 'Valor inicial x₀', placeholder: '1.5', type: 'number' },
      { id: 'tol', label: 'Tolerancia', placeholder: '0.0001', type: 'number' },
      { id: 'max_iter', label: 'Máx. Iteraciones', placeholder: '100', type: 'number' },
    ],
    run: (v) => metodoNewtonRaphson(v.f_expr, v.df_expr, parseFloat(v.x0), parseFloat(v.tol), parseInt(v.max_iter))
  },
  aitken: {
    name: 'Aceleración de Aitken',
    description: 'Acelera la convergencia del punto fijo con Δ² de Aitken.',
    fields: [
      { id: 'g_expr', label: 'Función g(x)', placeholder: 'sqrt(x + 2)', hint: 'Misma forma que punto fijo: x = g(x)', fullWidth: true },
      { id: 'x0', label: 'Valor inicial x₀', placeholder: '1', type: 'number' },
      { id: 'tol', label: 'Tolerancia', placeholder: '0.0001', type: 'number' },
      { id: 'max_iter', label: 'Máx. Iteraciones', placeholder: '100', type: 'number' },
    ],
    run: (v) => aceleracionAitken(v.g_expr, parseFloat(v.x0), parseFloat(v.tol), parseInt(v.max_iter))
  },
  lagrange: {
    name: 'Interpolación de Lagrange',
    description: 'Construye un polinomio que pasa por todos los puntos dados.',
    isLagrange: true,
    fields: [], // Dynamic point fields
    run: null // Handled separately
  },
  trapecio: {
    name: 'Trapecio',
    description: 'Aproxima la integral usando trapecios entre subintervalos.',
    fields: [
      { id: 'f_expr', label: 'Función f(x)', placeholder: 'x^2', hint: 'Función a integrar', fullWidth: true },
      { id: 'trap_mode', label: 'Variante de Trapecio', type: 'dropdown', options: [{ value: 'trap', label: 'Trapecio (default)' }, { value: 'rect_mid', label: 'Rectángulo (medio)' }, { value: 'rect_left', label: 'Rectángulo (izquierdo)' }], defaultValue: 'trap', fullWidth: true },
      { id: 'a', label: 'Límite inferior a', placeholder: '0', type: 'text', hint: 'Acepta: pi, pi/2, 2*pi, e, sqrt(...)' },
      { id: 'b', label: 'Límite superior b', placeholder: '1', type: 'text', hint: 'Acepta: pi, pi/2, 2*pi, e, sqrt(...)' },
      { id: 'n', label: 'Subintervalos (n)', placeholder: '4', type: 'number' },
    ],
    run: (v) => {
      const mode = v.trap_mode || 'trap';
      if (mode === 'rect_mid') {
        return metodoRectangulo(v.f_expr, parseMathVal(v.a), parseMathVal(v.b), parseInt(v.n));
      }
      if (mode === 'rect_left') {
        return metodoRectanguloIzquierdo(v.f_expr, parseMathVal(v.a), parseMathVal(v.b), parseInt(v.n));
      }
      return metodoTrapecio(v.f_expr, parseMathVal(v.a), parseMathVal(v.b), parseInt(v.n));
    }
  },
  simpson: {
    name: 'Simpson 1/3',
    description: 'Aproxima la integral con parábolas (n debe ser par).',
    fields: [
      { id: 'f_expr', label: 'Función f(x)', placeholder: 'x^2', hint: 'Función a integrar', fullWidth: true },
      { id: 'simpson_mode', label: 'Variante de Simpson', type: 'dropdown', options: [{ value: '13', label: 'Simpson 1/3' }, { value: '38', label: 'Simpson 3/8' }], defaultValue: '13', fullWidth: true },
      { id: 'a', label: 'Límite inferior a', placeholder: '0', type: 'text', hint: 'Acepta: pi, pi/2, 2*pi, e, sqrt(...)' },
      { id: 'b', label: 'Límite superior b', placeholder: '1', type: 'text', hint: 'Acepta: pi, pi/2, 2*pi, e, sqrt(...)' },
      { id: 'n', label: 'Subintervalos (n)', placeholder: '4 (par) o 6 (múltiplo de 3)', type: 'number' },
    ],
    run: (v) => {
      const mode = v.simpson_mode || '13';
      if (mode === '38') {
        return metodoSimpson38(v.f_expr, parseMathVal(v.a), parseMathVal(v.b), parseInt(v.n));
      }
      return metodoSimpson13(v.f_expr, parseMathVal(v.a), parseMathVal(v.b), parseInt(v.n));
    }
  },
  monte_carlo: {
    name: 'Monte Carlo - Integración',
    description: 'Estima integrales usando muestreo aleatorio.',
    fields: [
      { id: 'f_expr', label: 'Función f(x)', placeholder: 'x^2', hint: 'Función a integrar', fullWidth: true },
      { id: 'a', label: 'Límite inferior a', placeholder: '0', type: 'number' },
      { id: 'b', label: 'Límite superior b', placeholder: '1', type: 'number' },
      { id: 'n_muestras', label: 'Número de muestras', placeholder: '10000', type: 'number' },
    ],
    run: (v) => metodoMonteCarloIntegracion(v.f_expr, parseMathVal(v.a), parseMathVal(v.b), parseInt(v.n_muestras))
  },
  pi_approximation: {
    name: 'Monte Carlo - Aproximar π',
    description: 'Aproxima π usando círculo inscrito en cuadrado.',
    fields: [
      { id: 'n_puntos', label: 'Número de puntos', placeholder: '100000', type: 'number' },
    ],
    run: (v) => aproximarPi(parseInt(v.n_puntos))
  }
};

let currentMethod = 'biseccion';
let lagrangePoints = [{ x: '0', y: '0' }, { x: String(Math.PI / 2), y: '1' }, { x: String(Math.PI), y: '0' }];

// --- DOM References ---
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
  selectMethod('biseccion');
});

function renderSidebar() {
  const icons = {
    biseccion: '✂️',
    punto_fijo: '📌',
    newton_raphson: '🚀',
    aitken: '⚡',
    lagrange: '📈',
    trapecio: '📐',
    simpson: '📏',
    monte_carlo: '🎲',
    pi_approximation: '🥧'
  };
  const subtitles = {
    biseccion: 'Búsqueda de raíces',
    punto_fijo: 'Iteración x = g(x)',
    newton_raphson: 'Convergencia rápida',
    aitken: 'Δ² de Aitken',
    lagrange: 'Polinomio interpolante',
    trapecio: 'Regla del Trapecio',
    simpson: 'Regla de Simpson 1/3',
    monte_carlo: 'Muestreo aleatorio',
    pi_approximation: 'Aproximación de π'
  };

  const list = $('#method-list');
  list.innerHTML = '';

  Object.entries(METHODS).forEach(([key, m]) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <button class="method-btn" data-method="${key}" id="btn-${key}">
        <span class="btn-icon">${icons[key]}</span>
        <span class="btn-label">
          <span>${m.name}</span>
          <span class="btn-subtitle">${subtitles[key]}</span>
        </span>
      </button>
    `;
    list.appendChild(li);
  });

  $$('.method-btn').forEach(btn => {
    btn.addEventListener('click', () => selectMethod(btn.dataset.method));
  });
}

function selectMethod(key) {
  currentMethod = key;

  // Update sidebar active state
  $$('.method-btn').forEach(b => b.classList.remove('active'));
  $(`#btn-${key}`).classList.add('active');

  const method = METHODS[key];

  // Update header
  $('#method-title').textContent = method.name;
  $('#method-desc').textContent = method.description;

  // Build form
  renderForm(key, method);

  // Hide results
  $('.results-section').classList.remove('visible');
}

function renderForm(key, method) {
  const formContainer = $('#form-fields');
  formContainer.innerHTML = '';

  if (method.isLagrange) {
    renderLagrangeForm(formContainer);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'form-grid';

  method.fields.forEach(field => {
    const group = document.createElement('div');
    group.className = `form-group${field.fullWidth ? ' full-width' : ''}`;

    if (field.type === 'dropdown') {
      const options = field.options || [];
      const defaultValue = field.defaultValue || options[0]?.value || '';
      const optionsHtml = options.map(opt => `<option value="${opt.value}" ${opt.value === defaultValue ? 'selected' : ''}>${opt.label}</option>`).join('');
      group.innerHTML = `
        <label for="field-${field.id}">${field.label}</label>
        <select id="field-${field.id}" class="form-select">
          ${optionsHtml}
        </select>
      `;
    } else {
      group.innerHTML = `
        <label for="field-${field.id}">${field.label}</label>
        <input type="${field.type || 'text'}" id="field-${field.id}" placeholder="${field.placeholder}" step="any">
        ${field.hint ? `<span class="input-hint">${field.hint}</span>` : ''}
      `;
    }

    grid.appendChild(group);

    // Attach calculator to function expression fields
    if (isFunctionField(field.id)) {
      const calcKeyboard = createCalcKeyboard(`field-${field.id}`);
      group.appendChild(calcKeyboard);
      // Show calculator visible by default for function fields
      calcKeyboard.classList.add('visible');
    }
  });

  formContainer.appendChild(grid);
}

function renderLagrangeForm(container) {
  // Points
  const pointsGroup = document.createElement('div');
  pointsGroup.className = 'form-group full-width';
  pointsGroup.innerHTML = `<label>Puntos de Interpolación</label>`;

  const pointsContainer = document.createElement('div');
  pointsContainer.className = 'points-container';
  pointsContainer.id = 'lagrange-points';

  lagrangePoints.forEach((pt, i) => {
    pointsContainer.appendChild(createPointRow(i, pt.x, pt.y));
  });

  pointsGroup.appendChild(pointsContainer);

  const addBtn = document.createElement('button');
  addBtn.className = 'add-point-btn';
  addBtn.innerHTML = '＋ Agregar punto';
  addBtn.onclick = () => {
    lagrangePoints.push({ x: '', y: '' });
    pointsContainer.appendChild(createPointRow(lagrangePoints.length - 1, '', ''));
  };
  pointsGroup.appendChild(addBtn);
  container.appendChild(pointsGroup);

  // X to evaluate
  const grid = document.createElement('div');
  grid.className = 'form-grid';
  grid.innerHTML = `
    <div class="form-group">
      <label for="field-x_eval">Evaluar en x =</label>
      <input type="text" id="field-x_eval" placeholder="pi/4">
      <span class="input-hint">Acepta: pi, e, sqrt(), cbrt(), sin(), cos(), ^, etc.</span>
    </div>
  `;
  container.appendChild(grid);
}

function createPointRow(index, xVal, yVal) {
  const row = document.createElement('div');
  row.className = 'point-row';
  row.dataset.index = index;
  row.innerHTML = `
    <span class="point-label">${index + 1}.</span>
    <input type="text" class="lagrange-x" placeholder="x (ej: pi/2)" value="${xVal}">
    <input type="text" class="lagrange-y" placeholder="y (ej: 1)" value="${yVal}">
    <button class="remove-point-btn" title="Eliminar punto">×</button>
  `;

  row.querySelector('.remove-point-btn').onclick = () => {
    if (lagrangePoints.length <= 2) return;
    lagrangePoints.splice(index, 1);
    rerenderLagrangePoints();
  };

  // Sync values
  row.querySelector('.lagrange-x').oninput = (e) => lagrangePoints[index].x = e.target.value;
  row.querySelector('.lagrange-y').oninput = (e) => lagrangePoints[index].y = e.target.value;

  return row;
}

function rerenderLagrangePoints() {
  const pc = $('#lagrange-points');
  pc.innerHTML = '';
  lagrangePoints.forEach((pt, i) => {
    pc.appendChild(createPointRow(i, pt.x, pt.y));
  });
}

// Parses a value string that may contain pi, e, and math functions
function parseMathVal(str) {
  if (str === null || str === undefined || str.toString().trim() === '') return NaN;
  const sanitized = str.toString().trim()
    .replace(/\^/g, '**')
    .replace(/sqrt\(/gi, 'Math.sqrt(')
    .replace(/cbrt\(/gi, 'Math.cbrt(')
    .replace(/sin\(/gi, 'Math.sin(')
    .replace(/sen\(/gi, 'Math.sin(')
    .replace(/cos\(/gi, 'Math.cos(')
    .replace(/tan\(/gi, 'Math.tan(')
    .replace(/log\(/gi, 'Math.log(')
    .replace(/ln\(/gi, 'Math.log(')
    .replace(/log10\(/gi, 'Math.log10(')
    .replace(/abs\(/gi, 'Math.abs(')
    .replace(/exp\(/gi, 'Math.exp(')
    .replace(/pi/gi, String(Math.PI))
    .replace(/(?<![a-zA-Z\d\.])e(?![a-zA-Z\d\(])/g, String(Math.E));
  try {
    const result = Function('"use strict"; return (' + sanitized + ')')();
    return typeof result === 'number' ? result : NaN;
  } catch {
    return NaN;
  }
}

// --- Execute Method ---
function ejecutar() {
  const method = METHODS[currentMethod];
  let result;

  try {
    if (method.isLagrange) {
      // Collect Lagrange points
      const xPuntos = lagrangePoints.map(p => parseMathVal(p.x));
      const yPuntos = lagrangePoints.map(p => parseMathVal(p.y));
      const xEvalField = $('#field-x_eval');
      const xEval = xEvalField && xEvalField.value ? parseMathVal(xEvalField.value) : null;

      if (xPuntos.some(isNaN) || yPuntos.some(isNaN)) {
        showError('Todos los puntos deben tener valores numéricos válidos.');
        return;
      }

      result = interpolacionLagrange(xPuntos, yPuntos, xEval);
    } else {
      // Collect field values
      const values = {};
      method.fields.forEach(field => {
        const el = $(`#field-${field.id}`);
        values[field.id] = el.value || el.placeholder;
      });

      result = method.run(values);
    }

    if (result.error) {
      showError(result.message);
      return;
    }

    displayResults(result);

  } catch (e) {
    showError(e.message || 'Error inesperado al ejecutar el método.');
  }
}

// --- Display Results ---
function displayResults(result) {
  const section = $('.results-section');
  section.classList.add('visible');

  // Status badge
  const statusEl = $('#result-status');
  if (result.convergio) {
    statusEl.className = 'status-badge success';
    statusEl.innerHTML = `✅ Convergencia exitosa${result.iteraciones !== undefined ? ` en ${result.iteraciones} iteraciones` : ''}`;
  } else if (result.divergio) {
    statusEl.className = 'status-badge error';
    statusEl.innerHTML = `❌ El método divergió${result.motivoError ? ': ' + result.motivoError : ''}`;
  } else if (result.errorDerivada) {
    statusEl.className = 'status-badge error';
    statusEl.innerHTML = `❌ La derivada se hizo cero — imposible continuar`;
  } else {
    statusEl.className = 'status-badge warning';
    statusEl.innerHTML = `⚠️ Límite de iteraciones alcanzado sin convergencia`;
  }

  // Summary grid
  const summaryGrid = $('#summary-grid');
  summaryGrid.innerHTML = '';

  const isLagrange = METHODS[currentMethod].isLagrange;
  const isIntegration = result.isIntegration;
  const isPiAproximation = result.isPiAproximation;

  if (isPiAproximation) {
    addSummaryItem(summaryGrid, 'π Aproximado', fmt(result.piAproximado), true);
    addSummaryItem(summaryGrid, 'π Real', fmt(result.piReal), false);
    addSummaryItem(summaryGrid, 'Error Absoluto', fmtSci(result.errorAbsoluto), false);
    addSummaryItem(summaryGrid, 'Error %', fmt(result.errorPorcentaje) + '%', false);
    addSummaryItem(summaryGrid, 'Puntos dentro', result.puntosDestro.toLocaleString(), false);
    addSummaryItem(summaryGrid, 'Puntos totales', result.nPuntos.toLocaleString(), false);
  } else if (isIntegration) {
    addSummaryItem(summaryGrid, 'Integral Aproximada', fmt(result.integral), true);
    if (result.gaussLegendre) {
      addSummaryItem(summaryGrid, 'Gauss-Legendre (ref.)', fmt(result.gaussLegendre), false);
      addSummaryItem(summaryGrid, 'Error vs G-L', fmtSci(result.errorVsGauss), false);
    }
    if (result.n) {
      addSummaryItem(summaryGrid, 'Subintervalos (n)', result.n, false);
    }
    if (result.h) {
      addSummaryItem(summaryGrid, 'Paso (h)', fmt(result.h), false);
    }
    if (result.nMuestras) {
      addSummaryItem(summaryGrid, 'Muestras', result.nMuestras, false);
    }
    addSummaryItem(summaryGrid, 'Intervalo', `[${fmt(result.a ?? result.intervalo?.a)}, ${fmt(result.b ?? result.intervalo?.b)}]`, false);
  } else if (isLagrange) {
    addSummaryItem(summaryGrid, 'Grado del Polinomio', result.grado, false);
    addSummaryItem(summaryGrid, 'Puntos utilizados', result.dataPuntos.length, false);
    if (result.xEval !== null && result.xEval !== undefined) {
      addSummaryItem(summaryGrid, `P(${fmt(result.xEval)})`, fmt(result.resultado), true);
    }
    if (result.polinomio) {
      document.querySelectorAll('.poly-display').forEach(el => el.remove());
      const polyCard = document.createElement('div');
      polyCard.className = 'poly-display';
      const fracLine = result.polinomioFracciones && result.polinomioFracciones !== result.polinomio
        ? `<div class="poly-row"><span class="poly-label">P(x) =</span> <span class="poly-expr poly-frac">${result.polinomioFracciones}</span></div>`
        : '';
      polyCard.innerHTML = `
        <div class="poly-row"><span class="poly-label">P(x) =</span> <span class="poly-expr">${result.polinomio}</span></div>
        ${fracLine}
      `;
      summaryGrid.after(polyCard);
    }
  } else {
    if (result.raiz !== null && result.raiz !== undefined) {
      addSummaryItem(summaryGrid, 'Raíz Aproximada', fmt(result.raiz), true);
    }
    if (result.f_raiz !== undefined) {
      addSummaryItem(summaryGrid, 'f(raíz)', fmt(result.f_raiz), false);
    }
    addSummaryItem(summaryGrid, 'Error Final', fmtSci(result.error_final), false);
    addSummaryItem(summaryGrid, 'Iteraciones', result.iteraciones, false);
  }

  // Iteration table
  renderTable(result);

  // Lagrange steps
  if (isLagrange) {
    renderLagrangeSteps(result);
  } else {
    $('#lagrange-steps-card').style.display = 'none';
  }

  // Chart
  renderChart(result, isLagrange, isIntegration, isPiAproximation);
}

function renderLagrangeSteps(result) {
  const card = $('#lagrange-steps-card');
  const container = $('#lagrange-steps');
  card.style.display = 'block';
  container.innerHTML = '';

  const xPts = result.dataPuntos.map(p => p.x);
  const yPts = result.dataPuntos.map(p => p.y);
  const n = xPts.length;

  // Helper: format a number cleanly
  const fc = (v) => parseFloat(v.toFixed(6)).toString();

  let html = '';

  // --- Step 1: show each L_i(x) symbolically ---
  html += `<div class="step-section-title">Paso 1 — Bases de Lagrange L<sub>i</sub>(x)</div>`;

  for (let i = 0; i < n; i++) {
    // Numerator factors as string: (x - x_j)
    const numFactors = xPts
      .filter((_, j) => j !== i)
      .map(xj => {
        const sign = xj >= 0 ? ` - ${fc(xj)}` : ` + ${fc(Math.abs(xj))}`;
        return `(x${sign})`;
      })
      .join(' · ');

    // Denominator as string: product of (x_i - x_j)
    const denFactors = xPts
      .filter((_, j) => j !== i)
      .map(xj => `(${fc(xPts[i])} - ${fc(xj)})`)
      .join(' · ');

    // Computed denominator value
    let denVal = 1;
    xPts.forEach((xj, j) => { if (j !== i) denVal *= (xPts[i] - xj); });

    html += `
      <div class="step-block">
        <div class="step-label">L<sub>${i}</sub>(x)</div>
        <div class="step-formula">
          <div class="step-fraction">
            <span class="step-num">${numFactors}</span>
            <span class="step-bar"></span>
            <span class="step-den">${denFactors} = ${fc(denVal)}</span>
          </div>
        </div>
      </div>`;
  }

  // --- Step 2: write P(x) = sum of y_i * L_i(x) ---
  html += `<div class="step-section-title" style="margin-top:24px">Paso 2 — Construcción de P(x)</div>`;

  const terms = yPts.map((yi, i) => `${fc(yi)} · L<sub>${i}</sub>(x)`).join(' + ');
  html += `<div class="step-block"><div class="step-formula-line">P(x) = ${terms}</div></div>`;

  // --- Step 3: substitute L_i values and simplify ---
  html += `<div class="step-section-title" style="margin-top:24px">Paso 3 — Simplificación</div>`;

  // Show each non-zero contribution
  const contribs = yPts
    .map((yi, i) => ({ yi, i }))
    .filter(({ yi }) => Math.abs(yi) > 1e-9);

  if (contribs.length === 0) {
    html += `<div class="step-block"><div class="step-formula-line">P(x) = 0 (todos los y<sub>i</sub> son cero)</div></div>`;
  } else {
    const contribStr = contribs
      .map(({ yi, i }) => `${fc(yi)} · L<sub>${i}</sub>(x)`)
      .join(' + ');
    html += `<div class="step-block"><div class="step-formula-line">P(x) = ${contribStr}</div></div>`;
  }

  // --- Step 4: final polynomial ---
  html += `<div class="step-section-title" style="margin-top:24px">Paso 4 — Polinomio resultante</div>`;
  html += `<div class="step-block step-result">
    <div class="step-formula-line">P(x) = <span class="step-poly">${result.polinomio}</span></div>
  </div>`;

  // --- Step 5: evaluation at xEval (if provided) ---
  if (result.xEval !== null && result.xEval !== undefined) {
    html += `<div class="step-section-title" style="margin-top:24px">Paso 5 — Evaluación en x = ${fc(result.xEval)}</div>`;
    const evalTerms = yPts.map((yi, i) => {
      const h = result.historial[i];
      return `${fc(yi)} · ${h.Li_val !== null ? fc(h.Li_val) : '?'}`;
    }).join(' + ');
    html += `<div class="step-block">
      <div class="step-formula-line">P(${fc(result.xEval)}) = ${evalTerms}</div>
      <div class="step-formula-line step-result-val">= <span class="step-poly">${fc(result.resultado)}</span></div>
    </div>`;
  }

  container.innerHTML = html;
}

function addSummaryItem(container, label, value, highlight) {
  const item = document.createElement('div');
  item.className = 'summary-item';
  item.innerHTML = `
    <div class="item-label">${label}</div>
    <div class="item-value${highlight ? ' highlight' : ''}">${value}</div>
  `;
  container.appendChild(item);
}

function renderTable(result) {
  const wrapper = $('#table-wrapper');
  if (!result.historial || result.historial.length === 0) {
    wrapper.innerHTML = '<p style="color:var(--text-muted);padding:16px;">No se generaron iteraciones.</p>';
    return;
  }

  let html = '<table class="iter-table"><thead><tr>';
  result.columns.forEach(col => { html += `<th>${col}</th>`; });
  html += '</tr></thead><tbody>';

  result.historial.forEach(h => {
    html += '<tr>';
    result.getRow(h).forEach(val => {
      const display = typeof val === 'number' ? fmt(val) : (val === null ? '—' : val);
      html += `<td>${display}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  wrapper.innerHTML = html;
}

// --- Chart Rendering (Canvas) ---
function renderChart(result, isLagrange) {
  const container = $('#chart-container');
  
  const isIntegration = arguments[2];
  const isPiAproximation = arguments[3];
  
  // No draw chart for Pi approximation
  if (isPiAproximation) {
    container.innerHTML = '<p style="color:var(--text-muted);padding:16px;text-align:center;">Método probabilístico - Sin gráfico de convergencia</p>';
    return;
  }
  
  container.innerHTML = '<canvas id="chart-canvas"></canvas>';
  const canvas = $('#chart-canvas');
  const ctx = canvas.getContext('2d');

  // High DPI
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width;
  const H = rect.height;

  const pad = { top: 30, right: 30, bottom: 40, left: 60 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  if (isIntegration && result.graphPoints) {
    drawIntegrationChart(ctx, W, H, pad, plotW, plotH, result);
  } else if (isLagrange && result.graphPoints) {
    drawLagrangeChart(ctx, W, H, pad, plotW, plotH, result);
  } else if (result.historial && result.historial.length > 0) {
    drawConvergenceChart(ctx, W, H, pad, plotW, plotH, result);
  }
}

function drawConvergenceChart(ctx, W, H, pad, plotW, plotH, result) {
  const errors = result.historial.map(h => h.error !== undefined ? h.error : 0);
  const iters = result.historial.map(h => h.iter);

  const maxErr = Math.max(...errors) * 1.1 || 1;
  const minErr = 0;

  // Background
  ctx.fillStyle = 'rgba(10, 14, 26, 0.5)';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH * i / 5;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
  }

  // Y axis labels
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH * i / 5;
    const val = maxErr - (maxErr - minErr) * i / 5;
    ctx.fillText(fmtSci(val), pad.left - 8, y + 4);
  }

  // X axis labels
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(iters.length / 8));
  for (let i = 0; i < iters.length; i += step) {
    const x = pad.left + plotW * i / (iters.length - 1 || 1);
    ctx.fillText(iters[i], x, H - pad.bottom + 18);
  }

  // Axis titles
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('Iteración', W / 2, H - 4);

  ctx.save();
  ctx.translate(14, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Error', 0, 0);
  ctx.restore();

  // Line
  const gradient = ctx.createLinearGradient(pad.left, 0, W - pad.right, 0);
  gradient.addColorStop(0, '#6366f1');
  gradient.addColorStop(1, '#22d3ee');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();

  errors.forEach((err, i) => {
    const x = pad.left + plotW * i / (errors.length - 1 || 1);
    const y = pad.top + plotH * (1 - (err - minErr) / (maxErr - minErr || 1));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Area fill
  const areaGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  areaGrad.addColorStop(0, 'rgba(99, 102, 241, 0.15)');
  areaGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');

  ctx.fillStyle = areaGrad;
  ctx.beginPath();
  errors.forEach((err, i) => {
    const x = pad.left + plotW * i / (errors.length - 1 || 1);
    const y = pad.top + plotH * (1 - (err - minErr) / (maxErr - minErr || 1));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.closePath();
  ctx.fill();

  // Dots
  errors.forEach((err, i) => {
    const x = pad.left + plotW * i / (errors.length - 1 || 1);
    const y = pad.top + plotH * (1 - (err - minErr) / (maxErr - minErr || 1));
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0e1a';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Title
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 13px Inter';
  ctx.textAlign = 'left';
  ctx.fillText('Convergencia del Error', pad.left, 18);
}

function drawLagrangeChart(ctx, W, H, pad, plotW, plotH, result) {
  const pts = result.graphPoints;
  const data = result.dataPuntos;

  const allX = pts.map(p => p.x);
  const allY = pts.map(p => p.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY, ...data.map(d => d.y)) - 0.2;
  const maxY = Math.max(...allY, ...data.map(d => d.y)) + 0.2;

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const toCanvasX = (x) => pad.left + plotW * (x - minX) / rangeX;
  const toCanvasY = (y) => pad.top + plotH * (1 - (y - minY) / rangeY);

  // Background
  ctx.fillStyle = 'rgba(10, 14, 26, 0.5)';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH * i / 5;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
  }

  // Y labels
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH * i / 5;
    const val = maxY - rangeY * i / 5;
    ctx.fillText(val.toFixed(2), pad.left - 8, y + 4);
  }

  // X labels
  ctx.textAlign = 'center';
  for (let i = 0; i <= 5; i++) {
    const x = pad.left + plotW * i / 5;
    const val = minX + rangeX * i / 5;
    ctx.fillText(val.toFixed(2), x, H - pad.bottom + 18);
  }

  // Polynomial curve
  const gradient = ctx.createLinearGradient(pad.left, 0, W - pad.right, 0);
  gradient.addColorStop(0, '#6366f1');
  gradient.addColorStop(1, '#8b5cf6');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const cx = toCanvasX(p.x);
    const cy = toCanvasY(p.y);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.stroke();

  // Data points
  data.forEach(d => {
    const cx = toCanvasX(d.x);
    const cy = toCanvasY(d.y);

    // Glow
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(248, 113, 113, 0.2)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f87171';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });

  // Eval point
  if (result.xEval !== null && result.xEval !== undefined) {
    const cx = toCanvasX(result.xEval);
    const cy = toCanvasY(result.resultado);

    ctx.fillStyle = 'rgba(34, 211, 238, 0.15)';
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a0e1a';
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 11px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(`P(${fmt(result.xEval)}) = ${fmt(result.resultado)}`, cx + 12, cy - 6);
  }

  // Title
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 13px Inter';
  ctx.textAlign = 'left';
  ctx.fillText('Polinomio de Lagrange', pad.left, 18);

  // Legend
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(W - pad.right - 120, 10, 10, 10);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter';
  ctx.textAlign = 'left';
  ctx.fillText('P(x)', W - pad.right - 106, 19);

  ctx.fillStyle = '#f87171';
  ctx.beginPath(); ctx.arc(W - pad.right - 55, 15, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Datos', W - pad.right - 46, 19);
}

function drawIntegrationChart(ctx, W, H, pad, plotW, plotH, result) {
  const pts = result.graphPoints;
  const verts = Array.isArray(result.trapVertices) ? result.trapVertices : [];

  const allX = pts.map(p => p.x);
  const allY = pts.map(p => p.y);
  const minX = Math.min(...allX) - 0.2;
  const maxX = Math.max(...allX) + 0.2;
  const minYraw = Math.min(0, ...allY);
  const maxYraw = Math.max(...allY);
  const marginY = (maxYraw - minYraw) * 0.1 || 0.5;
  const minY = minYraw - marginY;
  const maxY = maxYraw + marginY;

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const toCanvasX = (x) => pad.left + plotW * (x - minX) / rangeX;
  const toCanvasY = (y) => pad.top + plotH * (1 - (y - minY) / rangeY);

  // Background
  ctx.fillStyle = 'rgba(10, 14, 26, 0.5)';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH * i / 5;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
  }

  // Y labels
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH * i / 5;
    const val = maxY - rangeY * i / 5;
    ctx.fillText(val.toFixed(2), pad.left - 8, y + 4);
  }

  // X labels
  ctx.textAlign = 'center';
  for (let i = 0; i <= 5; i++) {
    const x = pad.left + plotW * i / 5;
    const val = minX + rangeX * i / 5;
    ctx.fillText(val.toFixed(2), x, H - pad.bottom + 18);
  }

  // X axis line (y=0)
  const y0 = toCanvasY(0);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, y0);
  ctx.lineTo(W - pad.right, y0);
  ctx.stroke();

  // Shaded area under curve (trapezoids) - solo para Trapecio/Simpson
  if (verts && verts.length > 1) {
    const areaGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
    areaGrad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    areaGrad.addColorStop(1, 'rgba(99, 102, 241, 0.03)');

    for (let i = 0; i < verts.length - 1; i++) {
      ctx.fillStyle = areaGrad;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(verts[i].x), y0);
      ctx.lineTo(toCanvasX(verts[i].x), toCanvasY(verts[i].y));
      ctx.lineTo(toCanvasX(verts[i + 1].x), toCanvasY(verts[i + 1].y));
      ctx.lineTo(toCanvasX(verts[i + 1].x), y0);
      ctx.closePath();
      ctx.fill();

      // Subinterval border
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Subinterval vertical dashed lines
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
    verts.forEach(v => {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(v.x), y0);
      ctx.lineTo(toCanvasX(v.x), toCanvasY(v.y));
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  // Function curve
  const gradient = ctx.createLinearGradient(pad.left, 0, W - pad.right, 0);
  gradient.addColorStop(0, '#6366f1');
  gradient.addColorStop(1, '#22d3ee');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => {
    const cx = toCanvasX(p.x);
    const cy = toCanvasY(p.y);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.stroke();

  // Subinterval points
  if (verts.length > 0) {
    verts.forEach(v => {
      const cx = toCanvasX(v.x);
      const cy = toCanvasY(v.y);

      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#8b5cf6';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
  }

  // Title
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 13px Inter';
  ctx.textAlign = 'left';
  ctx.fillText(`${result.metodoIntegracion} — Área Aproximada`, pad.left, 18);

  // Integral value label
  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 12px JetBrains Mono';
  ctx.textAlign = 'right';
  ctx.fillText(`∫ ≈ ${fmt(result.integral)}`, W - pad.right, 19);
}

// --- Helpers ---
function fmt(num) {
  if (num === null || num === undefined) return '—';
  if (typeof num !== 'number') return num;
  if (Math.abs(num) < 0.0001 && num !== 0) return num.toExponential(4);
  return parseFloat(num.toFixed(8)).toString();
}

function fmtSci(num) {
  if (num === null || num === undefined) return '—';
  if (typeof num !== 'number') return num;
  if (Math.abs(num) < 0.001 && num !== 0) return num.toExponential(3);
  return parseFloat(num.toFixed(6)).toString();
}

function showError(msg) {
  const section = $('.results-section');
  section.classList.add('visible');
  const statusEl = $('#result-status');
  statusEl.className = 'status-badge error';
  statusEl.innerHTML = `❌ ${msg}`;
  $('#summary-grid').innerHTML = '';
  $('#table-wrapper').innerHTML = '';
  $('#chart-container').innerHTML = '';
}

// ============================================
// SCIENTIFIC CALCULATOR KEYBOARD
// ============================================
const CALC_BUTTONS = [
  // Row 1: Functions
  { label: 'sin(', css: 'fn' },
  { label: 'cos(', css: 'fn' },
  { label: 'tan(', css: 'fn' },
  { label: 'log(', css: 'fn', title: 'ln (base e)' },
  { label: 'log10(', css: 'fn' },
  { label: 'sqrt(', css: 'fn', display: '√(' },
  { label: 'abs(', css: 'fn', display: '|x|' },
  // Row 2: more functions + constants
  { label: 'exp(', css: 'fn' },
  { label: '^', css: 'op', display: 'xⁿ' },
  { label: '(', css: 'op' },
  { label: ')', css: 'op' },
  { label: 'pi', css: 'const', display: 'π' },
  { label: 'e', css: 'const' },
  { label: 'x', css: 'var' },
  // Row 3: numbers top
  { label: '7', css: 'num' },
  { label: '8', css: 'num' },
  { label: '9', css: 'num' },
  { label: '/', css: 'op', display: '÷' },
  { label: '*', css: 'op', display: '×' },
  { label: '⌫', css: 'action', action: 'backspace' },
  { label: 'AC', css: 'action', action: 'clear' },
  // Row 4: numbers mid
  { label: '4', css: 'num' },
  { label: '5', css: 'num' },
  { label: '6', css: 'num' },
  { label: '+', css: 'op' },
  { label: '-', css: 'op' },
  { label: '.', css: 'num' },
  { label: ',', css: 'num' },
  // Row 5: numbers bottom
  { label: '1', css: 'num' },
  { label: '2', css: 'num' },
  { label: '3', css: 'num' },
  { label: '0', css: 'num' },
  { label: ' ', css: 'num', display: '␣' },
  { label: 'ln(', css: 'fn', display: 'ln(' },
  { label: '^2', css: 'op', display: 'x²' },
];

function isFunctionField(fieldId) {
  return fieldId === 'f_expr' || fieldId === 'g_expr' || fieldId === 'df_expr';
}

function createCalcKeyboard(targetInputId) {
  const container = document.createElement('div');
  container.className = 'calc-keyboard';
  container.id = `calc-${targetInputId}`;

  // Header
  const header = document.createElement('div');
  header.className = 'calc-header';
  header.innerHTML = `
    <span class="calc-title">🧮 Calculadora Científica</span>
    <button class="calc-close" title="Cerrar">×</button>
  `;
  container.appendChild(header);

  header.querySelector('.calc-close').onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.classList.remove('visible');
  };

  // Button grid
  const grid = document.createElement('div');
  grid.className = 'calc-grid';

  CALC_BUTTONS.forEach(btn => {
    const el = document.createElement('button');
    el.className = `calc-btn ${btn.css}`;
    el.textContent = btn.display || btn.label;
    el.type = 'button';
    if (btn.title) el.title = btn.title;

    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById(targetInputId);
      if (!input) return;

      if (btn.action === 'backspace') {
        const pos = input.selectionStart;
        if (pos > 0) {
          input.value = input.value.slice(0, pos - 1) + input.value.slice(pos);
          input.setSelectionRange(pos - 1, pos - 1);
        }
      } else if (btn.action === 'clear') {
        input.value = '';
      } else {
        const pos = input.selectionStart;
        const end = input.selectionEnd;
        const text = btn.label;
        input.value = input.value.slice(0, pos) + text + input.value.slice(end);
        const newPos = pos + text.length;
        input.setSelectionRange(newPos, newPos);
      }

      input.focus();
    });

    grid.appendChild(el);
  });

  container.appendChild(grid);

  // Prevent clicks inside calculator from closing it
  container.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  return container;
}

function showCalcKeyboard(targetInputId) {
  // Hide all other calculators first
  document.querySelectorAll('.calc-keyboard').forEach(k => k.classList.remove('visible'));
  const calc = document.getElementById(`calc-${targetInputId}`);
  if (calc) calc.classList.add('visible');
}
