// ===================================================
// Método de Monte Carlo
// Integración numérica y aproximación de π
// Requiere: parseMathExpr (parser.js)
// ===================================================

// INTEGRACIÓN POR MONTE CARLO
function metodoMonteCarloIntegracion(fExpr, a, b, nMuestras) {
  let f;
  try {
    f = parseMathExpr(fExpr);
  } catch (e) {
    return { error: true, message: 'Expresion de funcion invalida' };
  }

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { error: true, message: 'a y b deben ser numeros validos' };
  }
  if (!Number.isFinite(nMuestras) || !Number.isInteger(nMuestras)) {
    return { error: true, message: 'nMuestras debe ser un entero valido' };
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
    if (!Number.isFinite(fx)) {
      return { error: true, message: 'La funcion devolvio un valor invalido en el intervalo' };
    }
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

  // Puntos para graficar la funcion en el intervalo
  const graphPoints = [];
  const steps = 200;
  for (let s = 0; s <= steps; s++) {
    const xv = a + (b - a) * s / steps;
    const yv = f(xv);
    if (Number.isFinite(yv)) {
      graphPoints.push({ x: xv, y: yv });
    }
  }

  return {
    convergio: true,
    isIntegration: true,
    metodoIntegracion: 'Monte Carlo',
    integral: integralEstimada,
    nMuestras: nMuestras,
    a,
    b,
    intervalo: { a, b },
    longitudIntervalo: longitudIntervalo,
    historial: historial,
    graphPoints: graphPoints,
    estadisticas: {
      fMin: fMin,
      fMax: fMax,
      fPromedio: promedioF,
      desvStd: desvStd
    },
    columns: ['Muestra', 'x', 'f(x)'],
    getRow: (h) => {
      if (h.muestra === '...') return ['...', '...', '...'];
      return [h.muestra, h.x.toFixed(6), h.fx.toFixed(6)];
    }
  };
}

// APROXIMACIÓN DE π USANDO MONTE CARLO
// Método: Círculo inscrito en cuadrado [0,1] x [0,1]
function aproximarPi(nPuntos) {
  if (!Number.isFinite(nPuntos) || !Number.isInteger(nPuntos)) {
    return { error: true, message: 'nPuntos debe ser un entero valido' };
  }
  if (nPuntos < 1) {
    return { error: true, message: 'nPuntos debe ser al menos 1' };
  }

  let puntosDentro = 0;

  // Generar puntos aleatorios y contar los que caen dentro del círculo
  for (let i = 0; i < nPuntos; i++) {
    const x = Math.random();
    const y = Math.random();
    const distancia = Math.sqrt(x * x + y * y);

    if (distancia <= 1) {
      puntosDentro++;
    }
  }

  // π ≈ 4 * (puntos_dentro / puntos_totales)
  const piAproximado = 4 * puntosDentro / nPuntos;
  const piReal = Math.PI;
  const error = Math.abs(piAproximado - piReal);
  const porcentajeError = (error / piReal) * 100;

  return {
    convergio: true,
    isPiAproximation: true,
    piAproximado: piAproximado,
    piReal: piReal,
    nPuntos: nPuntos,
    puntosDentro: puntosDentro,
    puntosAfuera: nPuntos - puntosDentro,
    razonDentro: puntosDentro / nPuntos,
    // Compatibilidad hacia atras (nombres antiguos)
    puntosDestro: puntosDentro,
    razonDestro: puntosDentro / nPuntos,
    errorAbsoluto: error,
    errorPorcentaje: porcentajeError,
    historial: [
      {
        metrica: 'Puntos dentro',
        valor: puntosDentro
      },
      {
        metrica: 'Puntos totales',
        valor: nPuntos
      },
      {
        metrica: 'Pi aproximado',
        valor: piAproximado
      },
      {
        metrica: 'Error absoluto',
        valor: error
      }
    ],
    columns: ['Metrica', 'Valor'],
    getRow: (h) => [h.metrica, h.valor]
  };
}

// MONTE CARLO MEJORADO CON MÁS INFORMACIÓN
function metodoMonteCarloCompleto(fExpr, a, b, nMuestras) {
  const resultado = metodoMonteCarloIntegracion(fExpr, a, b, nMuestras);
  
  if (resultado.error) {
    return resultado;
  }

  // Agregar información adicional
  resultado.metodologia = "Método de Monte Carlo para Integración Numérica";
  resultado.descripcion = "Genera puntos aleatorios en el intervalo [a,b], " +
                          "evalúa la función en esos puntos y estima la integral como " +
                          "longitud_intervalo × promedio_de_f(x)";
  
  return resultado;
}
