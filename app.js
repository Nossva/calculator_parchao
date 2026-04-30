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
// MONTE CARLO CON INTERVALO DE CONFIANZA
// Calcula n automáticamente dado z y error máximo, luego integra
// ============================================
function monteCarloConfianza(fExpr, a, b, confianza, errorMax) {
  const f = parseMathExpr(fExpr);

  // z values for common confidence levels
  const zMap = { 90: 1.645, 95: 1.960, 99: 2.576, 99.7: 3.000 };
  const z = zMap[confianza] || 1.960;

  // Pilot sample to estimate sigma
  const nPiloto = 1000;
  const piloto = [];
  for (let i = 0; i < nPiloto; i++) {
    const x = a + Math.random() * (b - a);
    piloto.push(f(x));
  }
  const meanP = piloto.reduce((s, v) => s + v, 0) / nPiloto;
  const varP = piloto.reduce((s, v) => s + (v - meanP) ** 2, 0) / nPiloto;
  const sigmaP = Math.sqrt(varP) * (b - a);

  // n = (z * sigma / errorMax)^2
  const nCalculado = Math.ceil((z * sigmaP / errorMax) ** 2);
  const n = Math.max(nCalculado, 1000);

  const fValores = [];
  for (let i = 0; i < n; i++) {
    const x = a + Math.random() * (b - a);
    fValores.push(f(x));
  }

  const long = b - a;
  const media = fValores.reduce((s, v) => s + v, 0) / n;
  const integral = long * media;
  const varianza = fValores.reduce((s, v) => s + (v - media) ** 2, 0) / n;
  const desvStd = Math.sqrt(varianza);
  const errorEst = long * desvStd / Math.sqrt(n);
  const ic_inf = integral - z * errorEst;
  const ic_sup = integral + z * errorEst;

  const historial = [
    { concepto: 'n calculado', valor: nCalculado },
    { concepto: 'n usado', valor: n },
    { concepto: 'z (' + confianza + '%)', valor: z },
    { concepto: 'σ estimada', valor: sigmaP.toFixed(8) },
    { concepto: 'Integral', valor: integral.toFixed(8) },
    { concepto: 'Error estándar', valor: errorEst.toFixed(8) },
    { concepto: 'IC inferior', valor: ic_inf.toFixed(8) },
    { concepto: 'IC superior', valor: ic_sup.toFixed(8) },
  ];

  const graphPoints = [];
  for (let s = 0; s <= 200; s++) {
    const xv = a + (b - a) * s / 200;
    graphPoints.push({ x: xv, y: f(xv) });
  }

  return {
    convergio: true,
    isIntegration: true,
    isConfianza: true,
    metodoIntegracion: 'Monte Carlo con IC',
    integral, nMuestras: n, a, b,
    intervalo: { a, b },
    ic: { inf: ic_inf, sup: ic_sup, z, confianza, errorEst },
    nCalculado,
    desvStd,
    graphPoints,
    historial,
    columns: ['Concepto', 'Valor'],
    getRow: (h) => [h.concepto, h.valor]
  };
}

// ============================================
// MONTE CARLO INTEGRAL DOBLE
// ∬ f(x,y) dy dx  con x ∈ [ax,bx], y ∈ [ay,by]
// ============================================
function monteCarloDoble(fExpr, ax, bx, ay, by, n) {
  // f must depend on x and y — we compile as function(x,y)
  let sanitized = fExpr
    .replace(/\^/g, '**')
    .replace(/sqrt\(/gi, 'Math.sqrt(')
    .replace(/cbrt\(/gi, 'Math.cbrt(')
    .replace(/sin\(/gi, 'Math.sin(')
    .replace(/sen\(/gi, 'Math.sin(')
    .replace(/cos\(/gi, 'Math.cos(')
    .replace(/tan\(/gi, 'Math.tan(')
    .replace(/exp\(/gi, 'Math.exp(')
    .replace(/log\(/gi, 'Math.log(')
    .replace(/ln\(/gi, 'Math.log(')
    .replace(/abs\(/gi, 'Math.abs(')
    .replace(/pi/gi, String(Math.PI))
    .replace(/(?<![a-zA-Z\d\.])e(?![a-zA-Z\d\(])/g, String(Math.E));

  let f;
  try {
    f = new Function('x', 'y', `"use strict"; return (${sanitized});`);
  } catch (e) {
    return { error: true, message: 'Expresión inválida para integral doble. Usa x e y como variables.' };
  }

  const area = (bx - ax) * (by - ay);
  const fValores = [];
  for (let i = 0; i < n; i++) {
    const x = ax + Math.random() * (bx - ax);
    const y = ay + Math.random() * (by - ay);
    const val = f(x, y);
    if (!isFinite(val)) continue;
    fValores.push(val);
  }

  const media = fValores.reduce((s, v) => s + v, 0) / fValores.length;
  const integral = area * media;
  const varianza = fValores.reduce((s, v) => s + (v - media) ** 2, 0) / fValores.length;
  const desvStd = Math.sqrt(varianza);
  const errorEst = area * desvStd / Math.sqrt(fValores.length);

  const historial = [
    { concepto: 'n muestras', valor: n },
    { concepto: 'Área dominio', valor: area.toFixed(6) },
    { concepto: 'Media f(x,y)', valor: media.toFixed(8) },
    { concepto: 'Integral ≈', valor: integral.toFixed(8) },
    { concepto: 'Desv. estándar', valor: desvStd.toFixed(8) },
    { concepto: 'Error estándar', valor: errorEst.toFixed(8) },
  ];

  // 2D graph: evaluate f(x, midY) along x for a preview curve
  const midY = (ay + by) / 2;
  const graphPoints = [];
  for (let s = 0; s <= 200; s++) {
    const xv = ax + (bx - ax) * s / 200;
    const yv = f(xv, midY);
    if (isFinite(yv)) graphPoints.push({ x: xv, y: yv });
  }

  return {
    convergio: true,
    isIntegration: true,
    isDoble: true,
    metodoIntegracion: 'Monte Carlo Doble',
    integral, nMuestras: n,
    a: ax, b: bx,
    intervalo: { a: ax, b: bx },
    desvStd, errorEst,
    graphPoints,
    historial,
    columns: ['Concepto', 'Valor'],
    getRow: (h) => [h.concepto, h.valor]
  };
}

// ============================================
// MONTE CARLO RECHAZO ENTRE CURVAS
// Estima el área entre f(x) y g(x) en [a,b]
// donde f(x) >= g(x) (si no, se invierte)
// ============================================
function monteCarloRechazo(fExpr, gExpr, a, b, n) {
  const fFunc = parseMathExpr(fExpr);
  const gFunc = parseMathExpr(gExpr);

  // Sample to find yMin and yMax for the bounding box
  let yMin = Infinity, yMax = -Infinity;
  const steps = 500;
  for (let s = 0; s <= steps; s++) {
    const x = a + (b - a) * s / steps;
    const fv = fFunc(x), gv = gFunc(x);
    if (isFinite(fv)) { yMin = Math.min(yMin, fv, gv); yMax = Math.max(yMax, fv, gv); }
  }
  yMin = Math.min(yMin, 0);

  const boxArea = (b - a) * (yMax - yMin);
  let dentroArea = 0;

  const scatterF = [], scatterG = [], scatterDentro = [], scatterFuera = [];
  const scatterMax = 2000; // only store a subset for rendering

  for (let i = 0; i < n; i++) {
    const x = a + Math.random() * (b - a);
    const y = yMin + Math.random() * (yMax - yMin);
    const fv = fFunc(x), gv = gFunc(x);
    const lo = Math.min(fv, gv), hi = Math.max(fv, gv);
    const inside = y >= lo && y <= hi;
    if (inside) dentroArea++;
    if (i < scatterMax) {
      (inside ? scatterDentro : scatterFuera).push({ x, y });
    }
  }

  // Build curve points
  for (let s = 0; s <= 200; s++) {
    const x = a + (b - a) * s / 200;
    scatterF.push({ x, y: fFunc(x) });
    scatterG.push({ x, y: gFunc(x) });
  }

  const areaEstimada = boxArea * dentroArea / n;
  const proporcion = dentroArea / n;
  const errorEst = boxArea * Math.sqrt(proporcion * (1 - proporcion) / n);

  const historial = [
    { concepto: 'n muestras', valor: n },
    { concepto: 'Puntos dentro', valor: dentroArea },
    { concepto: 'Área caja', valor: boxArea.toFixed(6) },
    { concepto: 'Área estimada', valor: areaEstimada.toFixed(8) },
    { concepto: 'Error estándar', valor: errorEst.toFixed(8) },
  ];

  return {
    convergio: true,
    isIntegration: false,
    isRechazo: true,
    integral: areaEstimada,
    nMuestras: n,
    a, b,
    scatterF, scatterG, scatterDentro, scatterFuera,
    yMin, yMax,
    historial,
    columns: ['Concepto', 'Valor'],
    getRow: (h) => [h.concepto, h.valor]
  };
}

// ============================================
// EDO — EULER, HEUN, RUNGE-KUTTA 4
// ============================================

function parseEDO(expr) {
  let s = expr
    .replace(/\^/g, '**')
    .replace(/sqrt\(/gi, 'Math.sqrt(')
    .replace(/cbrt\(/gi, 'Math.cbrt(')
    .replace(/sin\(/gi, 'Math.sin(')
    .replace(/sen\(/gi, 'Math.sin(')
    .replace(/cos\(/gi, 'Math.cos(')
    .replace(/tan\(/gi, 'Math.tan(')
    .replace(/exp\(/gi, 'Math.exp(')
    .replace(/log\(/gi, 'Math.log(')
    .replace(/ln\(/gi, 'Math.log(')
    .replace(/abs\(/gi, 'Math.abs(')
    .replace(/pi/gi, String(Math.PI))
    .replace(/(?<![a-zA-Z\d\.])e(?![a-zA-Z\d\(])/g, String(Math.E));
  return new Function('t', 'y', `"use strict"; return (${s});`);
}

function metodoEuler(fExpr, y0, t0, tf, h) {
  let f;
  try { f = parseEDO(fExpr); } catch(e) { return { error: true, message: 'Expresión inválida. Usa t e y como variables.' }; }
  if (h <= 0) return { error: true, message: 'El paso h debe ser mayor que 0.' };

  const historial = [];
  let t = t0, y = y0;
  historial.push({ paso: 0, t, y, k: null });

  while (t < tf - h * 1e-9) {
    const k = f(t, y);
    y = y + h * k;
    t = parseFloat((t + h).toFixed(10));
    historial.push({ paso: historial.length, t, y, k });
  }

  const graphPoints = historial.map(r => ({ x: r.t, y: r.y }));

  return {
    convergio: true, isEDO: true, metodoEDO: 'Euler',
    y_final: historial[historial.length - 1].y,
    t_final: historial[historial.length - 1].t,
    h, historial, graphPoints,
    columns: ['Paso', 't', 'y', 'f(t,y)'],
    getRow: (r) => [r.paso, fmt(r.t), fmt(r.y), r.k !== null ? fmt(r.k) : '—']
  };
}

function metodoHeun(fExpr, y0, t0, tf, h) {
  let f;
  try { f = parseEDO(fExpr); } catch(e) { return { error: true, message: 'Expresión inválida. Usa t e y como variables.' }; }
  if (h <= 0) return { error: true, message: 'El paso h debe ser mayor que 0.' };

  const historial = [];
  let t = t0, y = y0;
  historial.push({ paso: 0, t, y, k1: null, k2: null, yPred: null });

  while (t < tf - h * 1e-9) {
    const k1 = f(t, y);
    const yPred = y + h * k1;
    const k2 = f(t + h, yPred);
    y = y + (h / 2) * (k1 + k2);
    t = parseFloat((t + h).toFixed(10));
    historial.push({ paso: historial.length, t, y, k1, k2, yPred });
  }

  const graphPoints = historial.map(r => ({ x: r.t, y: r.y }));

  return {
    convergio: true, isEDO: true, metodoEDO: 'Heun',
    y_final: historial[historial.length - 1].y,
    t_final: historial[historial.length - 1].t,
    h, historial, graphPoints,
    columns: ['Paso', 't', 'y', 'k₁', 'k₂'],
    getRow: (r) => [r.paso, fmt(r.t), fmt(r.y), r.k1 !== null ? fmt(r.k1) : '—', r.k2 !== null ? fmt(r.k2) : '—']
  };
}

function metodoRK4(fExpr, y0, t0, tf, h) {
  let f;
  try { f = parseEDO(fExpr); } catch(e) { return { error: true, message: 'Expresión inválida. Usa t e y como variables.' }; }
  if (h <= 0) return { error: true, message: 'El paso h debe ser mayor que 0.' };

  const historial = [];
  let t = t0, y = y0;
  historial.push({ paso: 0, t, y, k1: null, k2: null, k3: null, k4: null });

  while (t < tf - h * 1e-9) {
    const k1 = f(t, y);
    const k2 = f(t + h/2, y + h/2 * k1);
    const k3 = f(t + h/2, y + h/2 * k2);
    const k4 = f(t + h,   y + h   * k3);
    y = y + (h / 6) * (k1 + 2*k2 + 2*k3 + k4);
    t = parseFloat((t + h).toFixed(10));
    historial.push({ paso: historial.length, t, y, k1, k2, k3, k4 });
  }

  const graphPoints = historial.map(r => ({ x: r.t, y: r.y }));

  // Campo director: grilla de flechas
  const campoDirector = [];
  const nx = 15, ny = 12;
  const tMin = t0, tMax = tf;
  const yVals = historial.map(r => r.y);
  const yMin = Math.min(...yVals) - Math.abs(Math.min(...yVals)) * 0.3 - 0.5;
  const yMax = Math.max(...yVals) + Math.abs(Math.max(...yVals)) * 0.3 + 0.5;
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= ny; j++) {
      const tt = tMin + (tMax - tMin) * i / nx;
      const yy = yMin + (yMax - yMin) * j / ny;
      const slope = f(tt, yy);
      if (isFinite(slope)) campoDirector.push({ t: tt, y: yy, slope });
    }
  }

  return {
    convergio: true, isEDO: true, isRK4: true, metodoEDO: 'Runge-Kutta 4',
    y_final: historial[historial.length - 1].y,
    t_final: historial[historial.length - 1].t,
    h, historial, graphPoints, campoDirector,
    yMin, yMax,
    columns: ['Paso', 't', 'y', 'k₁', 'k₂', 'k₃', 'k₄'],
    getRow: (r) => [r.paso, fmt(r.t), fmt(r.y),
      r.k1 !== null ? fmt(r.k1) : '—',
      r.k2 !== null ? fmt(r.k2) : '—',
      r.k3 !== null ? fmt(r.k3) : '—',
      r.k4 !== null ? fmt(r.k4) : '—']
  };
}

function compararEDO(fExpr, y0, t0, tf, h) {
  let f;
  try { f = parseEDO(fExpr); } catch(e) { return { error: true, message: 'Expresión inválida. Usa t e y como variables.' }; }
  if (h <= 0) return { error: true, message: 'El paso h debe ser mayor que 0.' };

  // Run all three methods
  const euler = [], heun = [], rk4 = [];
  let tE = t0, yE = y0;
  let tH = t0, yH = y0;
  let tR = t0, yR = y0;

  euler.push({ t: t0, y: y0 });
  heun.push({ t: t0, y: y0 });
  rk4.push({ t: t0, y: y0 });

  while (tE < tf - h * 1e-9) {
    // Euler
    yE = yE + h * f(tE, yE);
    tE = parseFloat((tE + h).toFixed(10));
    euler.push({ t: tE, y: yE });

    // Heun
    const k1h = f(tH, yH);
    const yPred = yH + h * k1h;
    yH = yH + (h/2) * (k1h + f(tH + h, yPred));
    tH = parseFloat((tH + h).toFixed(10));
    heun.push({ t: tH, y: yH });

    // RK4
    const k1 = f(tR, yR);
    const k2 = f(tR + h/2, yR + h/2*k1);
    const k3 = f(tR + h/2, yR + h/2*k2);
    const k4 = f(tR + h,   yR + h*k3);
    yR = yR + (h/6)*(k1 + 2*k2 + 2*k3 + k4);
    tR = parseFloat((tR + h).toFixed(10));
    rk4.push({ t: tR, y: yR });
  }

  // Historial comparativo
  const historial = euler.map((e, i) => ({
    paso: i,
    t: e.t,
    yEuler: e.y,
    yHeun: heun[i]?.y ?? '—',
    yRK4: rk4[i]?.y ?? '—'
  }));

  // Campo director usando RK4 f
  const campoDirector = [];
  const nx = 15, ny = 12;
  const allY = [...euler, ...heun, ...rk4].map(p => p.y);
  const yMin = Math.min(...allY) - 0.5;
  const yMax = Math.max(...allY) + 0.5;
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= ny; j++) {
      const tt = t0 + (tf - t0) * i / nx;
      const yy = yMin + (yMax - yMin) * j / ny;
      const slope = f(tt, yy);
      if (isFinite(slope)) campoDirector.push({ t: tt, y: yy, slope });
    }
  }

  return {
    convergio: true, isEDO: true, isComparacion: true, metodoEDO: 'Comparación',
    euler, heun, rk4, campoDirector, yMin, yMax,
    historial,
    columns: ['Paso', 't', 'y Euler', 'y Heun', 'y RK4'],
    getRow: (r) => [r.paso, fmt(r.t), fmt(r.yEuler), fmt(r.yHeun), fmt(r.yRK4)]
  };
}

// ============================================
// DIFERENCIAS FINITAS
// ============================================

// Módulo 1: Derivadas de f(x) en tabla de puntos (f' y f'' con diferencias centrales)
function difFinitasTabla(fExpr, xPuntos, h) {
  const f = parseMathExpr(fExpr);
  const n = xPuntos.length;
  if (n < 1) return { error: true, message: 'Ingresá al menos un punto x.' };

  const historial = xPuntos.map((x, i) => {
    const fx   = f(x);
    // f' — central donde se puede, adelante/atrás en extremos
    let f1, f1tipo;
    const fxph = f(x + h), fxmh = f(x - h);
    if (i > 0 && i < n - 1) {
      f1 = (fxph - fxmh) / (2 * h);
      f1tipo = 'central';
    } else if (i === 0) {
      f1 = (fxph - fx) / h;
      f1tipo = 'adelante';
    } else {
      f1 = (fx - fxmh) / h;
      f1tipo = 'atrás';
    }
    // f'' — central (necesita vecinos)
    const f2 = (i > 0 && i < n - 1) ? (fxph - 2*fx + fxmh) / (h*h) : null;
    // valor exacto cos(x) si aplica, para error
    return { x, fx, f1, f1tipo, f2 };
  });

  const graphPoints = [];
  const x0 = xPuntos[0], xf = xPuntos[n-1];
  for (let s = 0; s <= 200; s++) {
    const xv = x0 + (xf - x0) * s / 200;
    graphPoints.push({ x: xv, y: f(xv) });
  }
  const graphF1 = historial.map(r => ({ x: r.x, y: r.f1 }));

  return {
    convergio: true, isDifFinitas: true, modoDifFinitas: 'tabla',
    historial, graphPoints, graphF1,
    columns: ['x', 'f(x)', "f'(x)", 'Tipo', "f''(x)"],
    getRow: (r) => [fmt(r.x), fmt(r.fx), fmt(r.f1), r.f1tipo, r.f2 !== null ? fmt(r.f2) : '—']
  };
}

// Módulo 2: Comparar adelante / atrás / central en un punto, con error vs exacta
function difFinitasComparar(fExpr, x0, h) {
  const f = parseMathExpr(fExpr);
  const fx     = f(x0);
  const fxph   = f(x0 + h);
  const fxmh   = f(x0 - h);
  const fxp2h  = f(x0 + 2*h);
  const fxm2h  = f(x0 - 2*h);

  // Orden 1
  const adelante1  = (fxph - fx)   / h;
  const atras1     = (fx  - fxmh)  / h;
  const central1   = (fxph - fxmh) / (2*h);

  // Orden 2 (segunda derivada)
  const central2   = (fxph - 2*fx + fxmh) / (h*h);

  // Orden 2 - fórmulas de segundo orden para f'
  const adelante2o = (-fxp2h + 4*fxph - 3*fx) / (2*h);
  const atras2o    = (3*fx - 4*fxmh + fxm2h)  / (2*h);

  const historial = [
    { formula: "Adelante 1° orden",  valor: adelante1,  orden: 1, tipo: 'adelante' },
    { formula: "Atrás 1° orden",     valor: atras1,     orden: 1, tipo: 'atrás'   },
    { formula: "Central 1° orden",   valor: central1,   orden: 1, tipo: 'central' },
    { formula: "Adelante 2° orden",  valor: adelante2o, orden: 2, tipo: 'adelante' },
    { formula: "Atrás 2° orden",     valor: atras2o,    orden: 2, tipo: 'atrás'   },
    { formula: "Central 2° orden f''", valor: central2, orden: 2, tipo: 'central' },
  ];

  // Graph: f(x) around x0
  const graphPoints = [];
  for (let s = 0; s <= 200; s++) {
    const xv = (x0 - 3*h) + 6*h * s / 200;
    graphPoints.push({ x: xv, y: f(xv) });
  }

  return {
    convergio: true, isDifFinitas: true, modoDifFinitas: 'comparar',
    x0, h, fx,
    adelante1, atras1, central1, central2, adelante2o, atras2o,
    historial, graphPoints,
    columns: ['Fórmula', "f'(x₀) aprox.", 'Orden', 'Tipo'],
    getRow: (r) => [r.formula, fmt(r.valor), r.orden, r.tipo]
  };
}

// Módulo 3: Tabla de datos posición → velocidad y aceleración
function difFinitasDatos(tDatos, xDatos) {
  const n = tDatos.length;
  if (n < 3) return { error: true, message: 'Se necesitan al menos 3 puntos.' };
  if (n !== xDatos.length) return { error: true, message: 'La cantidad de t y x no coincide.' };

  const historial = tDatos.map((t, i) => {
    const h = i < n-1 ? tDatos[i+1] - tDatos[i] : tDatos[i] - tDatos[i-1];
    let v, a, vtipo, atipo;

    if (i === 0) {
      // Progresiva para v
      const h0 = tDatos[1] - tDatos[0];
      v = (xDatos[1] - xDatos[0]) / h0;
      vtipo = 'adelante';
      // Progresiva 2° para a
      const h1 = tDatos[2] - tDatos[0];
      a = (xDatos[2] - 2*xDatos[1] + xDatos[0]) / (h0*h0);
      atipo = 'adelante';
    } else if (i === n-1) {
      // Regresiva para v
      const hb = tDatos[i] - tDatos[i-1];
      v = (xDatos[i] - xDatos[i-1]) / hb;
      vtipo = 'atrás';
      a = (xDatos[i] - 2*xDatos[i-1] + xDatos[i-2]) / (hb*hb);
      atipo = 'atrás';
    } else {
      // Central
      const hb = (tDatos[i+1] - tDatos[i-1]) / 2;
      v = (xDatos[i+1] - xDatos[i-1]) / (tDatos[i+1] - tDatos[i-1]);
      vtipo = 'central';
      a = (xDatos[i+1] - 2*xDatos[i] + xDatos[i-1]) / (hb*hb);
      atipo = 'central';
    }

    return { i, t, x: xDatos[i], v, a, vtipo, atipo };
  });

  const graphX  = historial.map(r => ({ x: r.t, y: r.x }));
  const graphV  = historial.map(r => ({ x: r.t, y: r.v }));
  const graphA  = historial.map(r => ({ x: r.t, y: r.a }));

  return {
    convergio: true, isDifFinitas: true, modoDifFinitas: 'datos',
    historial, graphX, graphV, graphA,
    columns: ['i', 't (s)', 'x (m)', 'v (m/s)', 'a (m/s²)', 'Tipo v', 'Tipo a'],
    getRow: (r) => [r.i, fmt(r.t), fmt(r.x), fmt(r.v), fmt(r.a), r.vtipo, r.atipo]
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
      { id: 'confidence', label: 'Porcentaje de confianza', placeholder: '0.95', type: 'number', hint: 'Ej: 0.95 para 95%' },
      { id: 'sample_size_calc', label: 'Calcular muestras sugeridas', type: 'sample_size_calc', fullWidth: true },
      { id: 'a', label: 'Límite inferior a', placeholder: '0', type: 'text', hint: 'Acepta: pi, pi/2, 2*pi, e, sqrt(...)' },
      { id: 'b', label: 'Límite superior b', placeholder: '1', type: 'text', hint: 'Acepta: pi, pi/2, 2*pi, e, sqrt(...)' },
      { id: 'n_muestras', label: 'Número de muestras', placeholder: '10000', type: 'number' },
    ],
    run: (v) => metodoMonteCarloIntegracion(v.f_expr, parseMathVal(v.a), parseMathVal(v.b), parseInt(v.n_muestras))
  },
  monte_carlo_ic: {
    name: 'Monte Carlo - IC',
    description: 'Integración con intervalo de confianza y n automático.',
    fields: [
      { id: 'f_expr', label: 'Función f(x)', placeholder: 'exp(-x^2)', hint: 'Función a integrar', fullWidth: true },
      { id: 'a', label: 'Límite inferior a', placeholder: '0', type: 'number' },
      { id: 'b', label: 'Límite superior b', placeholder: '1', type: 'number' },
      { id: 'confianza', label: 'Confianza (%)', placeholder: '95', hint: '90 / 95 / 99 / 99.7', type: 'number' },
      { id: 'error_max', label: 'Error máximo', placeholder: '0.01', type: 'number' },
    ],
    run: (v) => monteCarloConfianza(v.f_expr, parseFloat(v.a), parseFloat(v.b), parseFloat(v.confianza), parseFloat(v.error_max))
  },
  monte_carlo_doble: {
    name: 'Monte Carlo - Integral Doble',
    description: 'Estima ∬ f(x,y) dy dx usando muestreo aleatorio.',
    fields: [
      { id: 'f_expr', label: 'Función f(x,y)', placeholder: 'exp(x+y)', hint: 'Usa x e y como variables', fullWidth: true },
      { id: 'ax', label: 'x mínimo', placeholder: '0', type: 'number' },
      { id: 'bx', label: 'x máximo', placeholder: '2', type: 'number' },
      { id: 'ay', label: 'y mínimo', placeholder: '1', type: 'number' },
      { id: 'by', label: 'y máximo', placeholder: '3', type: 'number' },
      { id: 'n_muestras', label: 'Muestras (n)', placeholder: '50000', type: 'number' },
    ],
    run: (v) => monteCarloDoble(v.f_expr, parseFloat(v.ax), parseFloat(v.bx), parseFloat(v.ay), parseFloat(v.by), parseInt(v.n_muestras))
  },
  monte_carlo_rechazo: {
    name: 'Monte Carlo - Rechazo',
    description: 'Estima el área entre dos curvas f(x) y g(x).',
    fields: [
      { id: 'f_expr', label: 'Curva superior f(x)', placeholder: 'sqrt(x)', hint: 'Primera curva', fullWidth: true },
      { id: 'g_expr', label: 'Curva inferior g(x)', placeholder: 'x^2', hint: 'Segunda curva', fullWidth: true },
      { id: 'a', label: 'x mínimo', placeholder: '0', type: 'number' },
      { id: 'b', label: 'x máximo', placeholder: '1', type: 'number' },
      { id: 'n_muestras', label: 'Muestras (n)', placeholder: '50000', type: 'number' },
    ],
    run: (v) => monteCarloRechazo(v.f_expr, v.g_expr, parseFloat(v.a), parseFloat(v.b), parseInt(v.n_muestras))
  },
  euler: {
    name: 'Euler',
    description: 'Resuelve EDO dy/dt = f(t,y) con el método de Euler.',
    fields: [
      { id: 'f_expr', label: "f(t, y)  —  dy/dt =", placeholder: 'y + t^2', hint: 'Usa t e y como variables', fullWidth: true },
      { id: 'y0', label: 'y(t₀)', placeholder: '1', type: 'number' },
      { id: 't0', label: 't₀', placeholder: '0', type: 'number' },
      { id: 'tf', label: 'tf', placeholder: '1', type: 'number' },
      { id: 'h', label: 'Paso h', placeholder: '0.1', type: 'number' },
    ],
    run: (v) => metodoEuler(v.f_expr, parseFloat(v.y0), parseFloat(v.t0), parseFloat(v.tf), parseFloat(v.h))
  },
  heun: {
    name: 'Heun (Euler mejorado)',
    description: 'Resuelve EDO dy/dt = f(t,y) con el método de Heun.',
    fields: [
      { id: 'f_expr', label: "f(t, y)  —  dy/dt =", placeholder: 'y + t^2', hint: 'Usa t e y como variables', fullWidth: true },
      { id: 'y0', label: 'y(t₀)', placeholder: '1', type: 'number' },
      { id: 't0', label: 't₀', placeholder: '0', type: 'number' },
      { id: 'tf', label: 'tf', placeholder: '1', type: 'number' },
      { id: 'h', label: 'Paso h', placeholder: '0.1', type: 'number' },
    ],
    run: (v) => metodoHeun(v.f_expr, parseFloat(v.y0), parseFloat(v.t0), parseFloat(v.tf), parseFloat(v.h))
  },
  runge_kutta: {
    name: 'Runge-Kutta 4',
    description: 'Resuelve EDO dy/dt = f(t,y) con RK4 y campo director.',
    fields: [
      { id: 'f_expr', label: "f(t, y)  —  dy/dt =", placeholder: 'y + t^2', hint: 'Usa t e y como variables', fullWidth: true },
      { id: 'y0', label: 'y(t₀)', placeholder: '1', type: 'number' },
      { id: 't0', label: 't₀', placeholder: '0', type: 'number' },
      { id: 'tf', label: 'tf', placeholder: '1', type: 'number' },
      { id: 'h', label: 'Paso h', placeholder: '0.1', type: 'number' },
    ],
    run: (v) => metodoRK4(v.f_expr, parseFloat(v.y0), parseFloat(v.t0), parseFloat(v.tf), parseFloat(v.h))
  },
  comparar_edo: {
    name: 'Comparar Euler / Heun / RK4',
    description: 'Compara los tres métodos en la misma EDO con tabla y gráfico.',
    fields: [
      { id: 'f_expr', label: "f(t, y)  —  dy/dt =", placeholder: 'y + t^2', hint: 'Usa t e y como variables', fullWidth: true },
      { id: 'y0', label: 'y(t₀)', placeholder: '1', type: 'number' },
      { id: 't0', label: 't₀', placeholder: '0', type: 'number' },
      { id: 'tf', label: 'tf', placeholder: '1', type: 'number' },
      { id: 'h', label: 'Paso h', placeholder: '0.1', type: 'number' },
    ],
    run: (v) => compararEDO(v.f_expr, parseFloat(v.y0), parseFloat(v.t0), parseFloat(v.tf), parseFloat(v.h))
  },
  diferencias_finitas: {
    name: 'Diferencias Finitas',
    description: 'Derivadas numéricas: tabla de puntos, comparación de fórmulas, datos discretos y tablas x,y.',
    isDifFinitasUnified: true,
    fields: [],
    run: null
  }
};

let currentMethod = 'biseccion';
let lagrangePoints = [{ x: '0', y: '0' }, { x: String(Math.PI / 2), y: '1' }, { x: String(Math.PI), y: '0' }];
let dfDatosRows = [
  {t:'0',x:'0'},{t:'1',x:'1.9'},{t:'2',x:'4.2'},{t:'3',x:'7.8'},
  {t:'4',x:'12'},{t:'5',x:'17'},{t:'6',x:'25'},{t:'7',x:'32'},{t:'8',x:'42'}
];

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
    monte_carlo_ic: '📊',
    monte_carlo_doble: '🔲',
    monte_carlo_rechazo: '🎯',
    euler: '📐',
    heun: '📏',
    runge_kutta: '🔬',
    comparar_edo: '⚖️',
    diferencias_finitas: '∂'
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
    monte_carlo_ic: 'Intervalo de confianza',
    monte_carlo_doble: 'Integral doble ∬',
    monte_carlo_rechazo: 'Área entre curvas',
    euler: 'EDO — Método de Euler',
    heun: 'EDO — Euler mejorado',
    runge_kutta: 'EDO — RK4 + campo director',
    comparar_edo: 'EDO — Comparación de métodos',
    diferencias_finitas: 'Derivadas numéricas'
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

  if (method.isDFDatos) {
    renderDFDatosForm(formContainer);
    return;
  }

  if (method.isDifFinitasUnified) {
    renderDifFinitasForm(formContainer);
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
    } else if (field.type === 'sample_size_calc') {
      group.innerHTML = `
        <label>${field.label}</label>
        <div class="sample-size-row">
          <button type="button" class="run-btn sample-size-btn" id="btn-sample-size">Calcular n sugerida</button>
          <span class="sample-size-result" id="sample-size-result">Resultado: -</span>
        </div>
      `;

      const calcBtn = group.querySelector('#btn-sample-size');
      const resultEl = group.querySelector('#sample-size-result');
      calcBtn.addEventListener('click', () => {
        const fExprEl = document.getElementById('field-f_expr');
        const aEl = document.getElementById('field-a');
        const bEl = document.getElementById('field-b');
        const confEl = document.getElementById('field-confidence');

        const fExpr = fExprEl ? (fExprEl.value || fExprEl.placeholder || '') : '';
        const aRaw = aEl ? (aEl.value || aEl.placeholder || '0') : '0';
        const bRaw = bEl ? (bEl.value || bEl.placeholder || '1') : '1';
        const a = parseMathVal(aRaw);
        const b = parseMathVal(bRaw);
        const confidence = confEl ? parseFloat(confEl.value || confEl.placeholder || '0.95') : 0.95;
        const intervalLooksDefault = String(aRaw).trim() === '0' && String(bRaw).trim() === '1';
        const isLnExample = /^\s*(ln|log)\s*\(\s*x\s*\)\s*$/i.test(fExpr.trim());
        const effectiveA = intervalLooksDefault && isLnExample ? 2 : a;
        const effectiveB = intervalLooksDefault && isLnExample ? 5 : b;
        const sampleSize = calcularMuestrasMonteCarlo(fExpr, effectiveA, effectiveB, confidence);

        if (!Number.isFinite(sampleSize) || sampleSize < 1) {
          resultEl.textContent = 'Resultado: datos inválidos (f(x), a, b o confianza)';
          return;
        }

        resultEl.textContent = `Resultado: n = ${sampleSize.toLocaleString()}`;

        const nEl = document.getElementById('field-n_muestras');
        if (nEl) nEl.value = String(sampleSize);
      });
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

function renderDFDatosForm(container) {
  const header = document.createElement('div');
  header.className = 'form-group full-width';
  header.innerHTML = `<label>Datos posición-tiempo</label>`;

  const table = document.createElement('div');
  table.id = 'df-datos-table';
  table.style.cssText = 'display:grid; grid-template-columns: 40px 1fr 1fr 40px; gap:6px; align-items:center; margin-bottom:8px;';

  const renderRows = () => {
    table.innerHTML = `
      <span style="color:var(--text-muted);font-size:.7rem;text-align:center">#</span>
      <span style="color:var(--text-muted);font-size:.7rem">t (seg)</span>
      <span style="color:var(--text-muted);font-size:.7rem">x (m)</span>
      <span></span>
    `;
    dfDatosRows.forEach((row, i) => {
      const num = document.createElement('span');
      num.style.cssText = 'color:var(--text-muted);font-size:.8rem;text-align:center';
      num.textContent = i + 1;

      const tIn = document.createElement('input');
      tIn.type = 'number'; tIn.step = 'any';
      tIn.className = 'df-t-input'; tIn.value = row.t; tIn.placeholder = 't';
      tIn.oninput = (e) => { dfDatosRows[i].t = e.target.value; };

      const xIn = document.createElement('input');
      xIn.type = 'number'; xIn.step = 'any';
      xIn.className = 'df-x-input'; xIn.value = row.x; xIn.placeholder = 'x';
      xIn.oninput = (e) => { dfDatosRows[i].x = e.target.value; };

      const del = document.createElement('button');
      del.className = 'remove-point-btn'; del.title = 'Eliminar'; del.textContent = '×';
      del.onclick = () => {
        if (dfDatosRows.length <= 3) return;
        dfDatosRows.splice(i, 1);
        renderRows();
      };

      table.appendChild(num); table.appendChild(tIn);
      table.appendChild(xIn); table.appendChild(del);
    });
  };

  renderRows();
  header.appendChild(table);

  const addBtn = document.createElement('button');
  addBtn.className = 'add-point-btn';
  addBtn.innerHTML = '＋ Agregar fila';
  addBtn.onclick = () => {
    dfDatosRows.push({ t: '', x: '' });
    renderRows();
  };
  header.appendChild(addBtn);
  container.appendChild(header);
}

// Módulo 4: Tabla x,y discreta → f' y f'' con diferencias finitas
function difFinitasDatosXY(xDatos, yDatos, xEval) {
  const n = xDatos.length;
  if (n < 3) return { error: true, message: 'Se necesitan al menos 3 puntos.' };
  if (n !== yDatos.length) return { error: true, message: 'La cantidad de x e y no coincide.' };

  const historial = xDatos.map((x, i) => {
    let f1, f2, f1tipo;
    if (i === 0) {
      f1 = (yDatos[1] - yDatos[0]) / (xDatos[1] - xDatos[0]);
      f2 = null; f1tipo = 'adelante';
    } else if (i === n - 1) {
      f1 = (yDatos[i] - yDatos[i-1]) / (xDatos[i] - xDatos[i-1]);
      f2 = null; f1tipo = 'atrás';
    } else {
      const hb = (xDatos[i+1] - xDatos[i-1]) / 2;
      f1 = (yDatos[i+1] - yDatos[i-1]) / (xDatos[i+1] - xDatos[i-1]);
      f2 = (yDatos[i+1] - 2*yDatos[i] + yDatos[i-1]) / (hb * hb);
      f1tipo = 'central';
    }
    return { x, y: yDatos[i], f1, f2, f1tipo };
  });

  // Evaluar f'(xEval) por interpolación si xEval no está en la tabla
  let evalResult = null;
  if (xEval !== null && xEval !== undefined && !isNaN(xEval)) {
    // Encontrar los dos puntos más cercanos
    const idx = xDatos.reduce((best, x, i) =>
      Math.abs(x - xEval) < Math.abs(xDatos[best] - xEval) ? i : best, 0);
    const i = Math.min(Math.max(idx, 1), n - 2);
    const hb = (xDatos[i+1] - xDatos[i-1]) / 2;
    const f1Eval = (yDatos[i+1] - yDatos[i-1]) / (xDatos[i+1] - xDatos[i-1]);
    const f2Eval = (yDatos[i+1] - 2*yDatos[i] + yDatos[i-1]) / (hb * hb);
    evalResult = { x: xEval, f1: f1Eval, f2: f2Eval, vecinos: [xDatos[i-1], xDatos[i], xDatos[i+1]] };
  }

  const graphY  = xDatos.map((x, i) => ({ x, y: yDatos[i] }));
  const graphF1 = historial.filter(r => r.f1 !== null).map(r => ({ x: r.x, y: r.f1 }));

  return {
    convergio: true, isDifFinitas: true, modoDifFinitas: 'xy',
    historial, evalResult, graphY, graphF1,
    columns: ['x', 'y', "f'(x)", "f''(x)", 'Tipo'],
    getRow: (r) => [fmt(r.x), fmt(r.y), fmt(r.f1), r.f2 !== null ? fmt(r.f2) : '—', r.f1tipo]
  };
}

// Estado del form unificado de diferencias finitas
let dfMode = 'tabla';
let dfXYRows = [
  { x: '0', y: '2' }, { x: '1', y: '6' }, { x: '2', y: '' },
  { x: '3', y: '12' }, { x: '4', y: '16' }
];

function renderDifFinitasForm(container) {
  container.innerHTML = '';

  // Selector de modo
  const modeGroup = document.createElement('div');
  modeGroup.className = 'form-group full-width';
  modeGroup.innerHTML = `
    <label for="df-mode-select">Modo de Diferencias Finitas</label>
    <select id="df-mode-select" class="form-select">
      <option value="tabla"   ${dfMode==='tabla'   ?'selected':''}>Tabla de puntos — f'(x) y f''(x) en múltiples x</option>
      <option value="comparar"${dfMode==='comparar'?'selected':''}>Comparar fórmulas — adelante, atrás y central</option>
      <option value="datos"   ${dfMode==='datos'   ?'selected':''}>Datos posición-tiempo — velocidad y aceleración</option>
      <option value="xy"      ${dfMode==='xy'      ?'selected':''}>Tabla x,y discreta — f'(x) con datos conocidos</option>
    </select>
  `;
  container.appendChild(modeGroup);

  const dynamicArea = document.createElement('div');
  dynamicArea.id = 'df-dynamic-fields';
  container.appendChild(dynamicArea);

  const sel = modeGroup.querySelector('#df-mode-select');
  sel.addEventListener('change', () => {
    dfMode = sel.value;
    renderDFDynamicFields(dynamicArea);
  });

  renderDFDynamicFields(dynamicArea);
}

function renderDFDynamicFields(area) {
  area.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'form-grid';

  if (dfMode === 'tabla') {
    grid.innerHTML = `
      <div class="form-group full-width">
        <label for="df-f-expr">Función f(x)</label>
        <input type="text" id="df-f-expr" placeholder="sin(x)" value="">
        <span class="input-hint">Usa x como variable</span>
      </div>
      <div class="form-group full-width">
        <label for="df-x-lista">Puntos x (separados por coma)</label>
        <input type="text" id="df-x-lista" placeholder="0, 0.1, 0.2, 0.3, 0.4, 0.5">
      </div>
      <div class="form-group">
        <label for="df-h">Paso h</label>
        <input type="number" id="df-h" placeholder="0.1" step="any">
      </div>
    `;
  } else if (dfMode === 'comparar') {
    grid.innerHTML = `
      <div class="form-group full-width">
        <label for="df-f-expr">Función f(x)</label>
        <input type="text" id="df-f-expr" placeholder="exp(-2*x) - x" value="">
        <span class="input-hint">Usa x como variable</span>
      </div>
      <div class="form-group">
        <label for="df-x0">Punto x₀</label>
        <input type="number" id="df-x0" placeholder="2" step="any">
      </div>
      <div class="form-group">
        <label for="df-h">Paso h</label>
        <input type="number" id="df-h" placeholder="0.01" step="any">
      </div>
    `;
  } else if (dfMode === 'datos') {
    area.appendChild(buildDFDatosTable());
    return;
  } else if (dfMode === 'xy') {
    area.appendChild(buildDFXYTable());
    const evalGroup = document.createElement('div');
    evalGroup.className = 'form-grid';
    evalGroup.style.marginTop = '12px';
    evalGroup.innerHTML = `
      <div class="form-group">
        <label for="df-x-eval">Evaluar f'(x) en x =</label>
        <input type="number" id="df-x-eval" placeholder="2.5" step="any">
        <span class="input-hint">Opcional — usa punto vecino más cercano</span>
      </div>
    `;
    area.appendChild(evalGroup);
    return;
  }
  area.appendChild(grid);
}

function buildDFDatosTable() {
  const wrap = document.createElement('div');
  wrap.className = 'form-group full-width';
  wrap.innerHTML = `<label>Datos posición-tiempo</label>`;
  const tbl = document.createElement('div');
  tbl.id = 'df-datos-table';
  tbl.style.cssText = 'display:grid;grid-template-columns:36px 1fr 1fr 36px;gap:6px;align-items:center;margin-bottom:8px;';

  const renderRows = () => {
    tbl.innerHTML = `
      <span style="color:var(--text-muted);font-size:.7rem;text-align:center">#</span>
      <span style="color:var(--text-muted);font-size:.7rem">t (seg)</span>
      <span style="color:var(--text-muted);font-size:.7rem">x (m)</span>
      <span></span>
    `;
    dfDatosRows.forEach((row, i) => {
      const num = Object.assign(document.createElement('span'), { textContent: i+1 });
      num.style.cssText = 'color:var(--text-muted);font-size:.8rem;text-align:center';
      const tIn = Object.assign(document.createElement('input'), { type:'number', step:'any', value: row.t, placeholder:'t' });
      tIn.oninput = e => { dfDatosRows[i].t = e.target.value; };
      const xIn = Object.assign(document.createElement('input'), { type:'number', step:'any', value: row.x, placeholder:'x' });
      xIn.oninput = e => { dfDatosRows[i].x = e.target.value; };
      const del = Object.assign(document.createElement('button'), { className:'remove-point-btn', title:'Eliminar', textContent:'×' });
      del.onclick = () => { if (dfDatosRows.length <= 3) return; dfDatosRows.splice(i,1); renderRows(); };
      tbl.append(num, tIn, xIn, del);
    });
  };
  renderRows();
  wrap.appendChild(tbl);
  const addBtn = Object.assign(document.createElement('button'), { className:'add-point-btn', innerHTML:'＋ Agregar fila' });
  addBtn.onclick = () => { dfDatosRows.push({t:'',x:''}); renderRows(); };
  wrap.appendChild(addBtn);
  return wrap;
}

function buildDFXYTable() {
  const wrap = document.createElement('div');
  wrap.className = 'form-group full-width';
  wrap.innerHTML = `<label>Tabla de datos (x, y)</label>`;
  const tbl = document.createElement('div');
  tbl.id = 'df-xy-table';
  tbl.style.cssText = 'display:grid;grid-template-columns:36px 1fr 1fr 36px;gap:6px;align-items:center;margin-bottom:8px;';

  const renderRows = () => {
    tbl.innerHTML = `
      <span style="color:var(--text-muted);font-size:.7rem;text-align:center">#</span>
      <span style="color:var(--text-muted);font-size:.7rem">x</span>
      <span style="color:var(--text-muted);font-size:.7rem">y = f(x)</span>
      <span></span>
    `;
    dfXYRows.forEach((row, i) => {
      const num = Object.assign(document.createElement('span'), { textContent: i+1 });
      num.style.cssText = 'color:var(--text-muted);font-size:.8rem;text-align:center';
      const xIn = Object.assign(document.createElement('input'), { type:'number', step:'any', value: row.x, placeholder:'x' });
      xIn.oninput = e => { dfXYRows[i].x = e.target.value; };
      const yIn = Object.assign(document.createElement('input'), { type:'number', step:'any', value: row.y, placeholder:'y' });
      yIn.oninput = e => { dfXYRows[i].y = e.target.value; };
      const del = Object.assign(document.createElement('button'), { className:'remove-point-btn', title:'Eliminar', textContent:'×' });
      del.onclick = () => { if (dfXYRows.length <= 3) return; dfXYRows.splice(i,1); renderRows(); };
      tbl.append(num, xIn, yIn, del);
    });
  };
  renderRows();
  wrap.appendChild(tbl);
  const addBtn = Object.assign(document.createElement('button'), { className:'add-point-btn', innerHTML:'＋ Agregar fila' });
  addBtn.onclick = () => { dfXYRows.push({x:'',y:''}); renderRows(); };
  wrap.appendChild(addBtn);
  return wrap;
}

function ejecutarDifFinitas() {
  if (dfMode === 'tabla') {
    const fExpr = $('#df-f-expr')?.value || 'sin(x)';
    const lista  = $('#df-x-lista')?.value || '0,0.1,0.2,0.3,0.4,0.5';
    const h      = parseFloat($('#df-h')?.value || '0.1');
    const xPuntos = lista.split(',').map(s => parseMathVal(s.trim())).filter(x => !isNaN(x));
    if (!xPuntos.length) { showError('Ingresá al menos un punto x válido.'); return null; }
    return difFinitasTabla(fExpr, xPuntos, h);
  }
  if (dfMode === 'comparar') {
    const fExpr = $('#df-f-expr')?.value || 'exp(-2*x)-x';
    const x0    = parseFloat($('#df-x0')?.value || '2');
    const h     = parseFloat($('#df-h')?.value  || '0.01');
    return difFinitasComparar(fExpr, x0, h);
  }
  if (dfMode === 'datos') {
    const tDatos = dfDatosRows.map(r => parseFloat(r.t));
    const xDatos = dfDatosRows.map(r => parseFloat(r.x));
    if (tDatos.some(isNaN) || xDatos.some(isNaN)) { showError('Todos los valores deben ser numéricos.'); return null; }
    return difFinitasDatos(tDatos, xDatos);
  }
  if (dfMode === 'xy') {
    const filas = dfXYRows
      .map(r => ({ x: parseFloat(r.x), y: parseFloat(r.y) }))
      .filter(r => !isNaN(r.x) && !isNaN(r.y));
    if (filas.length < 3) { showError('Se necesitan al menos 3 filas con x e y completos.'); return null; }
    const xDatos = filas.map(r => r.x);
    const yDatos = filas.map(r => r.y);
    const xEval = parseFloat($('#df-x-eval')?.value);
    return difFinitasDatosXY(xDatos, yDatos, isNaN(xEval) ? null : xEval);
  }
  return null;
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

// Sample-size estimate for Monte Carlo integration:
// n = (z_(alpha/2) * (b-a) * sigma_f / E)^2
// where sigma_f is std dev of f(X), X ~ U(a,b), and E is max absolute error.
function calcularMuestrasMonteCarlo(fExpr, a, b, confidence) {
  if (!Number.isFinite(confidence) || confidence <= 0 || confidence >= 1) return NaN;
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return NaN;
  if (!fExpr || !fExpr.trim()) return NaN;

  let f;
  try {
    f = parseMathExpr(fExpr);
  } catch {
    return NaN;
  }

  const z = zScoreFromConfidence(confidence);
  const targetError = 0.01;
  const intervalo = b - a;

  // Estimate E[f(X)] and E[f(X)^2] with Gauss-Legendre over [a,b].
  const meanF = gaussLegendre5(f, a, b) / intervalo;
  const meanF2 = gaussLegendre5((x) => {
    const fx = f(x);
    return fx * fx;
  }, a, b) / intervalo;

  const varF = Math.max(0, meanF2 - meanF * meanF);
  const sigmaF = Math.sqrt(varF);

  return Math.max(1, Math.ceil(((z * intervalo * sigmaF) / targetError) ** 2));
}

function zScoreFromConfidence(confidence) {
  const known = {
    0.8: 1.282,
    0.85: 1.44,
    0.9: 1.645,
    0.95: 1.96,
    0.98: 2.326,
    0.99: 2.576,
    0.995: 2.807,
    0.999: 3.291
  };

  // Snap to common confidence levels when very close.
  const key = Object.keys(known).find(k => Math.abs(Number(k) - confidence) < 1e-6);
  if (key) return known[key];

  // Fallback approximation around common values.
  if (confidence < 0.85) return 1.282;
  if (confidence < 0.925) return 1.645;
  if (confidence < 0.965) return 1.96;
  if (confidence < 0.985) return 2.326;
  if (confidence < 0.9975) return 2.576;
  return 3.291;
}

// --- Execute Method ---
function ejecutar() {
  const method = METHODS[currentMethod];
  let result;

  try {
    if (method.isLagrange) {
      const xPuntos = lagrangePoints.map(p => parseMathVal(p.x));
      const yPuntos = lagrangePoints.map(p => parseMathVal(p.y));
      const xEvalField = $('#field-x_eval');
      const xEval = xEvalField && xEvalField.value ? parseMathVal(xEvalField.value) : null;
      if (xPuntos.some(isNaN) || yPuntos.some(isNaN)) {
        showError('Todos los puntos deben tener valores numéricos válidos.');
        return;
      }
      result = interpolacionLagrange(xPuntos, yPuntos, xEval);
    } else if (method.isDFDatos) {
      const tDatos = dfDatosRows.map(r => parseFloat(r.t));
      const xDatos = dfDatosRows.map(r => parseFloat(r.x));
      if (tDatos.some(isNaN) || xDatos.some(isNaN)) {
        showError('Todos los valores de t y x deben ser numéricos.');
        return;
      }
      result = difFinitasDatos(tDatos, xDatos);
    } else if (method.isDifFinitasUnified) {
      result = ejecutarDifFinitas();
      if (!result) return;
    } else {
      // Collect field values
      const values = {};
      method.fields.forEach(field => {
        if (field.type === 'sample_size_calc') return;
        const el = $(`#field-${field.id}`);
        if (!el) return;
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
    statusEl.innerHTML = result.isDifFinitas
      ? `✅ Diferencias Finitas — ${result.historial.length} filas calculadas`
      : result.isEDO
      ? `✅ ${result.metodoEDO} — ${result.historial.length - 1} pasos completados`
      : result.isRechazo
      ? `✅ Área estimada: ${fmt(result.integral)} (n = ${result.nMuestras.toLocaleString()} muestras)`
      : result.isConfianza
        ? `✅ Integral estimada con IC ${result.ic.confianza}% — n = ${result.nMuestras.toLocaleString()}`
        : result.isDoble
          ? `✅ Integral doble estimada — n = ${result.nMuestras.toLocaleString()} muestras`
          : `✅ Convergencia exitosa${result.iteraciones !== undefined ? ` en ${result.iteraciones} iteraciones` : ''}`;
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
  } else if (result.isRechazo) {
    addSummaryItem(summaryGrid, 'Área estimada', fmt(result.integral), true);
    addSummaryItem(summaryGrid, 'Muestras (n)', result.nMuestras, false);
    addSummaryItem(summaryGrid, 'Intervalo x', `[${fmt(result.a)}, ${fmt(result.b)}]`, false);
  } else if (isIntegration) {
    addSummaryItem(summaryGrid, 'Integral Aproximada', fmt(result.integral), true);
    if (result.ic) {
      addSummaryItem(summaryGrid, `IC ${result.ic.confianza}% inferior`, fmt(result.ic.inf), false);
      addSummaryItem(summaryGrid, `IC ${result.ic.confianza}% superior`, fmt(result.ic.sup), false);
      addSummaryItem(summaryGrid, 'Error estándar', fmtSci(result.ic.errorEst), false);
    }
    if (result.nCalculado) {
      addSummaryItem(summaryGrid, 'n calculado', result.nCalculado, false);
    }
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
    if (result.desvStd !== undefined) {
      addSummaryItem(summaryGrid, 'Desv. estándar', fmtSci(result.desvStd), false);
    }
    const ia = result.a ?? result.intervalo?.a;
    const ib = result.b ?? result.intervalo?.b;
    if (ia !== undefined) addSummaryItem(summaryGrid, 'Intervalo', `[${fmt(ia)}, ${fmt(ib)}]`, false);
  } else if (result.isDifFinitas) {
    if (result.modoDifFinitas === 'comparar') {
      addSummaryItem(summaryGrid, 'x₀', fmt(result.x0), false);
      addSummaryItem(summaryGrid, 'h', fmt(result.h), false);
      addSummaryItem(summaryGrid, 'f(x₀)', fmt(result.fx), false);
      addSummaryItem(summaryGrid, "f' central (ord 1)", fmt(result.central1), true);
      addSummaryItem(summaryGrid, "f' adelante (ord 1)", fmt(result.adelante1), false);
      addSummaryItem(summaryGrid, "f' atrás (ord 1)", fmt(result.atras1), false);
      addSummaryItem(summaryGrid, "f'' central (ord 2)", fmt(result.central2), false);
    } else if (result.modoDifFinitas === 'tabla') {
      addSummaryItem(summaryGrid, 'Puntos evaluados', result.historial.length, false);
      addSummaryItem(summaryGrid, "f' en primer punto", fmt(result.historial[0]?.f1), false);
      addSummaryItem(summaryGrid, "f' en último punto", fmt(result.historial[result.historial.length-1]?.f1), false);
    } else if (result.modoDifFinitas === 'datos') {
      const vMax = Math.max(...result.historial.map(r => Math.abs(r.v)));
      const aMax = Math.max(...result.historial.map(r => Math.abs(r.a)));
      addSummaryItem(summaryGrid, 'Puntos', result.historial.length, false);
      addSummaryItem(summaryGrid, 'v máx (m/s)', fmt(vMax), true);
      addSummaryItem(summaryGrid, 'a máx (m/s²)', fmt(aMax), false);
    } else if (result.modoDifFinitas === 'xy') {
      addSummaryItem(summaryGrid, 'Puntos', result.historial.length, false);
      addSummaryItem(summaryGrid, "f'(x) central en x medio", fmt(result.historial[Math.floor(result.historial.length/2)]?.f1), false);
      if (result.evalResult) {
        addSummaryItem(summaryGrid, `f'(${fmt(result.evalResult.x)})`, fmt(result.evalResult.f1), true);
        addSummaryItem(summaryGrid, `f''(${fmt(result.evalResult.x)})`, fmt(result.evalResult.f2), false);
      }
    }
  } else if (result.isEDO) {
    addSummaryItem(summaryGrid, 'Método', result.metodoEDO, false);
    addSummaryItem(summaryGrid, 'Paso h', fmt(result.h), false);
    addSummaryItem(summaryGrid, 'Pasos totales', result.historial.length - 1, false);
    if (!result.isComparacion) {
      addSummaryItem(summaryGrid, `y(${fmt(result.t_final)})`, fmt(result.y_final), true);
    } else {
      const last = result.historial[result.historial.length - 1];
      addSummaryItem(summaryGrid, `y Euler (t=${fmt(last.t)})`, fmt(last.yEuler), false);
      addSummaryItem(summaryGrid, `y Heun  (t=${fmt(last.t)})`, fmt(last.yHeun), false);
      addSummaryItem(summaryGrid, `y RK4   (t=${fmt(last.t)})`, fmt(last.yRK4), true);
    }
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
  } else if (result.isDifFinitas && result.modoDifFinitas === 'xy') {
    renderDFXYSteps(result);
  } else {
    $('#lagrange-steps-card').style.display = 'none';
  }

  // Chart
  renderChart(result, isLagrange, isIntegration, isPiAproximation);
}

function renderDFXYSteps(result) {
  const card = $('#lagrange-steps-card');
  const container = $('#lagrange-steps');
  card.style.display = 'block';
  // Update title
  card.querySelector('.card-title').innerHTML = `<span class="title-icon">🧮</span> Desarrollo — Diferencias Finitas`;
  container.innerHTML = '';

  const fc = (v) => (v === null || v === undefined) ? '—' : parseFloat(v.toFixed(6)).toString();
  let html = '';

  html += `<div class="step-section-title">Fórmulas utilizadas</div>`;
  html += `<div class="step-block">
    <div class="step-formula-line"><strong>Diferencia central (interiores):</strong></div>
    <div class="step-formula-line" style="margin-top:6px">
      <div class="step-fraction" style="display:inline-flex;flex-direction:column;align-items:center;gap:2px">
        <span class="step-num">f(x<sub>i+1</sub>) − f(x<sub>i-1</sub>)</span>
        <span class="step-bar" style="width:100%;height:1px;background:var(--text-muted);display:block;margin:3px 0"></span>
        <span class="step-den">x<sub>i+1</sub> − x<sub>i-1</sub></span>
      </div>
    </div>
    <div class="step-formula-line" style="margin-top:12px"><strong>Diferencia adelante (primer punto):</strong></div>
    <div class="step-formula-line" style="margin-top:6px">
      <div class="step-fraction" style="display:inline-flex;flex-direction:column;align-items:center;gap:2px">
        <span class="step-num">f(x<sub>1</sub>) − f(x<sub>0</sub>)</span>
        <span class="step-bar" style="width:100%;height:1px;background:var(--text-muted);display:block;margin:3px 0"></span>
        <span class="step-den">x<sub>1</sub> − x<sub>0</sub></span>
      </div>
    </div>
    <div class="step-formula-line" style="margin-top:12px"><strong>Diferencia atrás (último punto):</strong></div>
    <div class="step-formula-line" style="margin-top:6px">
      <div class="step-fraction" style="display:inline-flex;flex-direction:column;align-items:center;gap:2px">
        <span class="step-num">f(x<sub>n</sub>) − f(x<sub>n-1</sub>)</span>
        <span class="step-bar" style="width:100%;height:1px;background:var(--text-muted);display:block;margin:3px 0"></span>
        <span class="step-den">x<sub>n</sub> − x<sub>n-1</sub></span>
      </div>
    </div>
  </div>`;

  html += `<div class="step-section-title" style="margin-top:20px">Paso a paso — Cálculo de f'(x) en cada punto</div>`;

  const h = result.historial;
  const n = h.length;
  h.forEach((r, i) => {
    let formula = '';
    if (r.f1tipo === 'central') {
      const prev = h[i-1], next = h[i+1];
      formula = `f'(${fc(r.x)}) = (${fc(next.y)} − ${fc(prev.y)}) / (${fc(next.x)} − ${fc(prev.x)}) = <span class="step-poly">${fc(r.f1)}</span>`;
    } else if (r.f1tipo === 'adelante') {
      const next = h[i+1];
      formula = `f'(${fc(r.x)}) = (${fc(next.y)} − ${fc(r.y)}) / (${fc(next.x)} − ${fc(r.x)}) = <span class="step-poly">${fc(r.f1)}</span>`;
    } else {
      const prev = h[i-1];
      formula = `f'(${fc(r.x)}) = (${fc(r.y)} − ${fc(prev.y)}) / (${fc(r.x)} − ${fc(prev.x)}) = <span class="step-poly">${fc(r.f1)}</span>`;
    }

    let f2line = '';
    if (r.f2 !== null && r.f2 !== undefined) {
      const prev = h[i-1], next = h[i+1];
      const hVal = (next.x - prev.x) / 2;
      f2line = `<div class="step-formula-line" style="margin-top:8px">
        f''(${fc(r.x)}) = (${fc(next.y)} − 2·${fc(r.y)} + ${fc(prev.y)}) / (${fc(hVal)})² = <span class="step-poly">${fc(r.f2)}</span>
      </div>`;
    }

    html += `<div class="step-block">
      <div class="step-label">Punto ${i+1}: x = ${fc(r.x)}, y = ${fc(r.y)} — <em>${r.f1tipo}</em></div>
      <div class="step-formula-line">${formula}</div>
      ${f2line}
    </div>`;
  });

  if (result.evalResult) {
    const ev = result.evalResult;
    html += `<div class="step-section-title" style="margin-top:20px">Evaluación en x = ${fc(ev.x)}</div>`;
    html += `<div class="step-block step-result">
      <div class="step-formula-line">Vecinos usados: x = ${ev.vecinos.map(fc).join(', ')}</div>
      <div class="step-formula-line" style="margin-top:6px">f'(${fc(ev.x)}) = <span class="step-poly">${fc(ev.f1)}</span></div>
      ${ev.f2 !== null ? `<div class="step-formula-line" style="margin-top:4px">f''(${fc(ev.x)}) = <span class="step-poly">${fc(ev.f2)}</span></div>` : ''}
    </div>`;
  }

  container.innerHTML = html;
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

  if (result.isDifFinitas) {
    drawDifFinitasChart(ctx, W, H, pad, plotW, plotH, result);
  } else if (result.isEDO) {
    drawEDOChart(ctx, W, H, pad, plotW, plotH, result);
  } else if (result.isRechazo) {
    drawRechazoChart(ctx, W, H, pad, plotW, plotH, result);
  } else if (isIntegration && result.graphPoints) {
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

function drawDifFinitasChart(ctx, W, H, pad, plotW, plotH, result) {
  // Helper: draw a polyline
  function polyline(pts, color, lineW, xKey, yKey) {
    if (!pts || pts.length === 0) return;
    ctx.strokeStyle = color; ctx.lineWidth = lineW;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => {
      const cx = toX(p[xKey]), cy = toY(p[yKey]);
      if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
  }
  function dots(pts, color, r, xKey, yKey) {
    pts.forEach(p => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(toX(p[xKey]), toY(p[yKey]), r, 0, Math.PI*2); ctx.fill();
    });
  }

  // Gather all points to compute ranges
  let allX = [], allY = [];
  if (result.modoDifFinitas === 'tabla') {
    allX = result.graphPoints.map(p => p.x);
    allY = [...result.graphPoints.map(p => p.y), ...result.graphF1.map(p => p.y)];
  } else if (result.modoDifFinitas === 'comparar') {
    allX = result.graphPoints.map(p => p.x);
    allY = result.graphPoints.map(p => p.y);
  } else if (result.modoDifFinitas === 'datos') {
    allX = result.graphX.map(p => p.x);
    allY = [...result.graphX.map(p => p.y), ...result.graphV.map(p => p.y), ...result.graphA.map(p => p.y)];
  } else if (result.modoDifFinitas === 'xy') {
    allX = result.graphY.map(p => p.x);
    allY = [...result.graphY.map(p => p.y), ...result.graphF1.map(p => p.y)];
  }

  const xMin = Math.min(...allX), xMax = Math.max(...allX);
  const yMin = Math.min(...allY) - 0.5, yMax = Math.max(...allY) + 0.5;
  const rangeX = xMax - xMin || 1, rangeY = yMax - yMin || 1;

  const toX = (x) => pad.left + plotW * (x - xMin) / rangeX;
  const toY = (y) => pad.top  + plotH * (1 - (y - yMin) / rangeY);

  // Background + grid
  ctx.fillStyle = 'rgba(10,14,26,0.5)'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH * i / 5;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W-pad.right, y); ctx.stroke();
    const x = pad.left + plotW * i / 5;
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top+plotH); ctx.stroke();
  }
  // Axis y=0
  if (yMin < 0 && yMax > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    const y0 = toY(0);
    ctx.beginPath(); ctx.moveTo(pad.left, y0); ctx.lineTo(W-pad.right, y0); ctx.stroke();
  }
  // Labels
  ctx.fillStyle = '#64748b'; ctx.font = '11px Inter'; ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    ctx.fillText((yMax - rangeY*i/5).toFixed(2), pad.left-6, pad.top+plotH*i/5+4);
  }
  ctx.textAlign = 'center';
  for (let i = 0; i <= 5; i++) {
    ctx.fillText((xMin + rangeX*i/5).toFixed(2), pad.left+plotW*i/5, H-pad.bottom+16);
  }

  if (result.modoDifFinitas === 'tabla') {
    polyline(result.graphPoints, '#6366f1', 2, 'x', 'y');
    polyline(result.graphF1,    '#22d3ee', 2, 'x', 'y');
    dots(result.historial, '#f87171', 4, 'x', 'f1');
    ctx.fillStyle='#f1f5f9'; ctx.font='bold 13px Inter'; ctx.textAlign='left';
    ctx.fillText("f(x) y f'(x) — Diferencias Finitas", pad.left, 18);
    // Legend
    ctx.fillStyle='#6366f1'; ctx.fillRect(W-160, 8, 10, 10);
    ctx.fillStyle='#94a3b8'; ctx.font='11px Inter'; ctx.textAlign='left'; ctx.fillText('f(x)', W-146, 17);
    ctx.fillStyle='#22d3ee'; ctx.fillRect(W-100, 8, 10, 10);
    ctx.fillText("f'(x)", W-86, 17);
  } else if (result.modoDifFinitas === 'comparar') {
    polyline(result.graphPoints, '#6366f1', 2.5, 'x', 'y');
    ctx.fillStyle='#f1f5f9'; ctx.font='bold 13px Inter'; ctx.textAlign='left';
    ctx.fillText('f(x) — Comparación de fórmulas', pad.left, 18);
  } else if (result.modoDifFinitas === 'datos') {
    polyline(result.graphX, '#6366f1', 2.5, 'x', 'y');
    polyline(result.graphV, '#22d3ee', 2,   'x', 'y');
    polyline(result.graphA, '#f97316', 2,   'x', 'y');
    dots(result.graphX, '#6366f1', 4, 'x', 'y');
    dots(result.graphV, '#22d3ee', 4, 'x', 'y');
    dots(result.graphA, '#f97316', 4, 'x', 'y');
    ctx.fillStyle='#f1f5f9'; ctx.font='bold 13px Inter'; ctx.textAlign='left';
    ctx.fillText('Posición / Velocidad / Aceleración', pad.left, 18);
    const lx = W - pad.right - 200;
    [['x(t)', '#6366f1'], ['v(t)', '#22d3ee'], ['a(t)', '#f97316']].forEach(([lbl, col], i) => {
      ctx.fillStyle = col; ctx.fillRect(lx + i*65, 8, 10, 10);
      ctx.fillStyle = '#94a3b8'; ctx.font='11px Inter'; ctx.textAlign='left';
      ctx.fillText(lbl, lx + i*65 + 14, 17);
    });
  } else if (result.modoDifFinitas === 'xy') {
    polyline(result.graphY,  '#6366f1', 2.5, 'x', 'y');
    polyline(result.graphF1, '#22d3ee', 2,   'x', 'y');
    dots(result.graphY,  '#6366f1', 5, 'x', 'y');
    dots(result.graphF1, '#22d3ee', 5, 'x', 'y');
    // Mark xEval if present
    if (result.evalResult) {
      const cx = toX(result.evalResult.x);
      const cy = toY(result.evalResult.f1);
      ctx.fillStyle = 'rgba(251,191,36,0.2)';
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px JetBrains Mono'; ctx.textAlign = 'left';
      ctx.fillText(`f'(${fmt(result.evalResult.x)}) = ${fmt(result.evalResult.f1)}`, cx + 12, cy - 6);
    }
    ctx.fillStyle='#f1f5f9'; ctx.font='bold 13px Inter'; ctx.textAlign='left';
    ctx.fillText("y = f(x)  y  f'(x) — Datos discretos", pad.left, 18);
    ctx.fillStyle='#6366f1'; ctx.fillRect(W-160, 8, 10, 10);
    ctx.fillStyle='#94a3b8'; ctx.font='11px Inter'; ctx.textAlign='left'; ctx.fillText('f(x)', W-146, 17);
    ctx.fillStyle='#22d3ee'; ctx.fillRect(W-100, 8, 10, 10);
    ctx.fillText("f'(x)", W-86, 17);
  }
}

function drawEDOChart(ctx, W, H, pad, plotW, plotH, result) {
  const allPts = result.isComparacion
    ? [...result.euler, ...result.heun, ...result.rk4]
    : result.graphPoints;

  const tMin = Math.min(...allPts.map(p => p.x ?? p.t));
  const tMax = Math.max(...allPts.map(p => p.x ?? p.t));
  const yMin = result.yMin ?? Math.min(...allPts.map(p => p.y)) - 0.5;
  const yMax = result.yMax ?? Math.max(...allPts.map(p => p.y)) + 0.5;
  const rangeT = tMax - tMin || 1;
  const rangeY = yMax - yMin || 1;

  const toX = (t) => pad.left + plotW * (t - tMin) / rangeT;
  const toY = (y) => pad.top + plotH * (1 - (y - yMin) / rangeY);

  // Background
  ctx.fillStyle = 'rgba(10,14,26,0.5)';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH * i / 5;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    const x = pad.left + plotW * i / 5;
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke();
  }

  // Axis labels
  ctx.fillStyle = '#64748b'; ctx.font = '11px Inter'; ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    ctx.fillText((yMax - rangeY * i / 5).toFixed(2), pad.left - 6, pad.top + plotH * i / 5 + 4);
  }
  ctx.textAlign = 'center';
  for (let i = 0; i <= 5; i++) {
    ctx.fillText((tMin + rangeT * i / 5).toFixed(2), pad.left + plotW * i / 5, H - pad.bottom + 16);
  }

  // Campo director (flechas cortas)
  if (result.campoDirector) {
    const maxSlope = Math.max(...result.campoDirector.map(d => Math.abs(d.slope)));
    const arrowLen = Math.min(plotW, plotH) / 20;
    ctx.strokeStyle = 'rgba(100,116,139,0.35)'; ctx.lineWidth = 1;
    result.campoDirector.forEach(({ t, y, slope }) => {
      const angle = Math.atan(slope * (plotH / rangeY) / (plotW / rangeT));
      const cx = toX(t), cy = toY(y);
      const dx = Math.cos(angle) * arrowLen / 2;
      const dy = Math.sin(angle) * arrowLen / 2;
      ctx.beginPath();
      ctx.moveTo(cx - dx, cy + dy);
      ctx.lineTo(cx + dx, cy - dy);
      ctx.stroke();
    });
  }

  // Draw curves
  function drawCurve(pts, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => {
      const cx = toX(p.x ?? p.t), cy = toY(p.y);
      if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
    // Dots
    pts.forEach(p => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(toX(p.x ?? p.t), toY(p.y), 3, 0, Math.PI * 2); ctx.fill();
    });
  }

  if (result.isComparacion) {
    drawCurve(result.euler, '#f97316');
    drawCurve(result.heun,  '#22d3ee');
    drawCurve(result.rk4,   '#a78bfa');
    // Legend
    const lx = pad.left;
    [[' Euler', '#f97316'], [' Heun', '#22d3ee'], [' RK4', '#a78bfa']].forEach(([label, color], i) => {
      ctx.fillStyle = color; ctx.fillRect(lx + i * 80, 8, 12, 12);
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter'; ctx.textAlign = 'left';
      ctx.fillText(label, lx + i * 80 + 16, 18);
    });
  } else {
    const color = result.metodoEDO === 'Euler' ? '#f97316' : result.metodoEDO === 'Heun' ? '#22d3ee' : '#a78bfa';
    drawCurve(result.graphPoints, color);
  }

  // Title
  ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 13px Inter'; ctx.textAlign = 'left';
  ctx.fillText(result.campoDirector ? `${result.metodoEDO} + Campo Director` : result.metodoEDO, pad.left, result.campoDirector ? 36 : 18);
}

function drawRechazoChart(ctx, W, H, pad, plotW, plotH, result) {
  const { scatterF, scatterG, scatterDentro, scatterFuera, a, b, yMin, yMax } = result;

  const rangeX = b - a || 1;
  const rangeY = yMax - yMin || 1;

  const toX = (x) => pad.left + plotW * (x - a) / rangeX;
  const toY = (y) => pad.top + plotH * (1 - (y - yMin) / rangeY);

  // Background
  ctx.fillStyle = 'rgba(10, 14, 26, 0.5)';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH * i / 5;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    const x = pad.left + plotW * i / 5;
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke();
  }

  // Axis labels
  ctx.fillStyle = '#64748b'; ctx.font = '11px Inter'; ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH * i / 5;
    ctx.fillText((yMax - rangeY * i / 5).toFixed(2), pad.left - 6, y + 4);
  }
  ctx.textAlign = 'center';
  for (let i = 0; i <= 5; i++) {
    const x = pad.left + plotW * i / 5;
    ctx.fillText((a + rangeX * i / 5).toFixed(2), x, H - pad.bottom + 16);
  }

  // Scatter — fuera (grey)
  ctx.fillStyle = 'rgba(100,116,139,0.25)';
  scatterFuera.forEach(p => {
    ctx.beginPath(); ctx.arc(toX(p.x), toY(p.y), 2, 0, Math.PI * 2); ctx.fill();
  });

  // Scatter — dentro (cyan)
  ctx.fillStyle = 'rgba(34,211,238,0.45)';
  scatterDentro.forEach(p => {
    ctx.beginPath(); ctx.arc(toX(p.x), toY(p.y), 2, 0, Math.PI * 2); ctx.fill();
  });

  // Curve f(x) — purple
  ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2.5; ctx.beginPath();
  scatterF.forEach((p, i) => {
    const cx = toX(p.x), cy = toY(p.y);
    if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
  });
  ctx.stroke();

  // Curve g(x) — orange
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5; ctx.beginPath();
  scatterG.forEach((p, i) => {
    const cx = toX(p.x), cy = toY(p.y);
    if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
  });
  ctx.stroke();

  // Title
  ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 13px Inter'; ctx.textAlign = 'left';
  ctx.fillText(`Monte Carlo - Rechazo  Área ≈ ${result.integral.toFixed(6)}`, pad.left, 18);

  // Legend
  const lx = W - pad.right - 160;
  ctx.fillStyle = '#8b5cf6'; ctx.fillRect(lx, 8, 10, 10);
  ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter'; ctx.textAlign = 'left';
  ctx.fillText('f(x)', lx + 14, 17);
  ctx.fillStyle = '#f97316'; ctx.fillRect(lx + 45, 8, 10, 10);
  ctx.fillText('g(x)', lx + 59, 17);
  ctx.fillStyle = 'rgba(34,211,238,0.7)'; ctx.beginPath(); ctx.arc(lx + 100, 13, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#94a3b8'; ctx.fillText('dentro', lx + 108, 17);
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
