// ===================================================
// Parser Matemático Seguro
// Transforma expresiones como "x^2 + sin(x)" en funciones JS
// ===================================================

function parseMathExpr(expr) {
  let sanitized = expr
    .replace(/\^/g, '**')
    .replace(/sen\(/gi, 'Math.sin(')
    .replace(/cos\(/gi, 'Math.cos(')
    .replace(/tan\(/gi, 'Math.tan(')
    .replace(/sin\(/gi, 'Math.sin(')
    .replace(/cbrt\(/gi, 'Math.cbrt(')
    .replace(/sqrt\(/gi, 'Math.sqrt(')
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
