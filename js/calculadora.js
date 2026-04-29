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
