import numpy as np
import matplotlib.pyplot as plt
import sympy as sp
import math

def interpolacion_lagrange(x_puntos, y_puntos, f_simbolica=None, x_eval=None):
    """
    Realiza la interpolación de Lagrange y desarrolla el cálculo de la COTA DE ERROR GLOBAL.
    """
    x = sp.Symbol('x')
    n = len(x_puntos) - 1
    intervalo = (min(x_puntos), max(x_puntos))
    polinomio_final = 0
    lista_L = []

    print(f"--- 1. PROCESO DE CONSTRUCCIÓN DEL POLINOMIO (Grado {n}) ---")
    for i in range(len(x_puntos)):
        numerador = 1
        denominador = 1
        for j in range(len(x_puntos)):
            if i != j:
                numerador *= (x - x_puntos[j])
                denominador *= (x_puntos[i] - x_puntos[j])
        
        Li = sp.simplify(numerador / denominador)
        lista_L.append(Li)
        print(f"L_{i}(x) = {Li}")
        polinomio_final += y_puntos[i] * Li

    P_simplificado = sp.simplify(polinomio_final)
    print(f"\nPolinomio Final P(x) = {P_simplificado}")

    # --- 2. DESARROLLO DEL ERROR TEÓRICO (COTA GLOBAL) ---
    print(f"\n--- 2. DESARROLLO DEL ERROR (Análisis de Omega) ---")
    
    # Cálculo de Omega(x)
    omega = 1
    for xi in x_puntos:
        omega *= (x - xi)
    omega = sp.expand(omega)
    print(f"Omega(x) = {omega}")

    # Búsqueda del Máximo de Omega (Derivada y puntos críticos)
    d_omega = sp.diff(omega, x)
    print(f"Derivada Omega'(x) = {sp.simplify(d_omega)}  <-- Buscamos raíces de esto")
    
    puntos_criticos = sp.solve(d_omega, x)
    # Evaluamos solo los puntos dentro del intervalo
    picos_en_intervalo = [p.evalf() for p in puntos_criticos if intervalo[0] <= p.evalf() <= intervalo[1]]
    
    valores_omega = [abs(omega.subs(x, p).evalf()) for p in picos_en_intervalo]
    max_omega = max(valores_omega) if valores_omega else 0
    print(f"Puntos críticos encontrados en {intervalo}: {picos_en_intervalo}")
    print(f"Máximo valor de |Omega(x)| (Cota Geométrica): {max_omega:.6f}")

    # Análisis de la Derivada de la Función (si se provee f_simbolica)
    if f_simbolica:
        derivada_error = sp.diff(f_simbolica, x, n + 1)
        # Evaluamos en una malla fina para encontrar el máximo de la derivada en el intervalo
        puntos_malla = np.linspace(float(intervalo[0]), float(intervalo[1]), 200)
        f_der_num = sp.lambdify(x, sp.abs(derivada_error), 'numpy')
        max_f_der = max(f_der_num(puntos_malla))
        
        cota_global = (max_f_der / math.factorial(n + 1)) * max_omega
        print(f"Derivada f^({n+1})(x) = {derivada_error}")
        print(f"Máximo de |f^({n+1})| en el intervalo: {max_f_der:.6f}")
        print(f"\n>>> COTA DE ERROR TEÓRICA GLOBAL: {cota_global:.6e}")

    # --- 3. EVALUACIÓN LOCAL ---
    if x_eval is not None:
        val_P = float(P_simplificado.subs(x, x_eval))
        print(f"\n--- 3. EVALUACIÓN EN x = {x_eval} ---")
        print(f"P({x_eval}) = {val_P:.6f}")
        
        if f_simbolica:
            val_real = float(f_simbolica.subs(x, x_eval))
            print(f"Valor Real f({x_eval}) = {val_real:.6f}")
            print(f"Error Local Absoluto: {abs(val_real - val_P):.6e}")

    # --- GRAFICACIÓN ---
    x_range = np.linspace(float(intervalo[0]-0.5), float(intervalo[1]+0.5), 200)
    y_p = [float(P_simplificado.subs(x, v)) for v in x_range]
    
    plt.figure(figsize=(10, 6))
    plt.plot(x_range, y_p, label=f'Lagrange $P_{n}(x)$', color='blue')
    plt.scatter(x_puntos, y_puntos, color='red', label='Datos')
    
    if f_simbolica:
        f_num = sp.lambdify(x, f_simbolica, 'numpy')
        plt.plot(x_range, f_num(x_range), '--', label='Función Real $f(x)$', color='green', alpha=0.5)

    plt.title("Interpolación y Análisis de Error")
    plt.grid(True)
    plt.legend()
    plt.savefig('lagrange_uade.png')
    print("\nGráfico guardado como 'lagrange_uade.png'")

# --- EJEMPLO DE USO (Caso Seno de la guía) ---
x_sym = sp.Symbol('x')
f_seno = sp.sin(x_sym)

puntos_x = [0, math.pi/2, math.pi]
puntos_y = [0, 1, 0]

# Ejecutamos
interpolacion_lagrange(puntos_x, puntos_y, f_simbolica=f_seno, x_eval=math.pi/4)