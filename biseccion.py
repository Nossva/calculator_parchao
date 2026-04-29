import pandas as pd
from typing import Callable, Dict, Any

def metodo_biseccion(f: Callable[[float], float], a: float, b: float, tol: float = 1e-6, max_iter: int = 100, decimales: int = 6) -> Dict[str, Any]:
    """
    Encuentra la raíz de una función f(x) en el intervalo [a, b] usando el método de bisección.
    Incluye un reporte visual detallado por consola con formato decimal ajustable.
    """
    # 1. Validación inicial (Teorema de Bolzano)
    if f(a) * f(b) >= 0:
        raise ValueError("Error: f(a) y f(b) deben tener signos opuestos. El intervalo no contiene una raíz garantizada.")

    # Variables de estado
    historial = []
    iteracion = 0
    error = abs(b - a) / 2.0
    c = a 

    # 2. Bucle principal
    while error > tol and iteracion < max_iter:
        c = (a + b) / 2.0
        fc = f(c)

        historial.append({
            'Iter': iteracion + 1,
            'a': a,
            'b': b,
            'c': c,
            'f(c)': fc,
            'Error': error
        })

        if fc == 0:
            error = 0.0
            break

        if f(a) * fc < 0:
            b = c 
        else:
            a = c 

        error = abs(b - a) / 2.0
        iteracion += 1

    # 3. Preparación de datos finales
    convergio = error <= tol or fc == 0
    df_historial = pd.DataFrame(historial)

    # ---------------------------------------------------------
    # 4. SECCIÓN DE PRESENTACIÓN VISUAL (Reporte en Consola)
    # ---------------------------------------------------------
    print("\n" + "="*65)
    print("🔍 REPORTE: MÉTODO DE BISECCIÓN".center(65))
    print("="*65)
    
    # Resumen de estado
    if convergio:
        print(f"✅ Convergencia exitosa alcanzada en {iteracion} iteraciones.")
    else:
        print(f"⚠️ Límite de iteraciones ({max_iter}) alcanzado sin convergencia.")
    
    print("-" * 65)
    
    # Formateamos los números inyectando la variable 'decimales' dinámicamente
    print(f"📍 Raíz aproximada (c) :  {c:.{decimales}f}")
    print(f"🎯 Valor de f(c)       :  {fc:.{decimales}f}") 
    print(f"📏 Error estimado      :  {error:.{decimales}f}")
    print(f"⚙️  Tolerancia objetivo :  {tol:.{decimales}f}")
    print("-" * 65)
    
    print("\n📋 HISTORIAL DE ITERACIONES:")
    
    # Creamos una copia del DF y aplicamos el formato dinámico a TODAS las columnas float
    df_visual = df_historial.copy()
    formato_str = f'{{:.{decimales}f}}' # Crea un string tipo '{:.4f}' si decimales=4
    
    df_visual['a'] = df_visual['a'].map(formato_str.format)
    df_visual['b'] = df_visual['b'].map(formato_str.format)
    df_visual['c'] = df_visual['c'].map(formato_str.format)
    df_visual['f(c)'] = df_visual['f(c)'].map(formato_str.format)
    df_visual['Error'] = df_visual['Error'].map(formato_str.format)
    
    # Imprimimos la tabla sin el índice
    print(df_visual.to_string(index=False, justify='center'))
    print("="*65 + "\n")

    # 5. Retorno de los datos crudos
    return {
        "raiz_aproximada": c,
        "convergio": convergio,
        "iteraciones_realizadas": iteracion,
        "error_final": error,
        "f_en_raiz": fc,
        "historial_df": df_historial 
    }

# ==========================================
# EJECUCIÓN DEL CÓDIGO
# ==========================================
if __name__ == "__main__":
    
    # Definimos la función matemática a evaluar
    def mi_funcion(x: float) -> float:
        return x**4 - 2*x**3 - 4*x**2 + 4*x + 4

    # Ejecutamos con una tolerancia estándar, pidiendo que muestre 4 decimales
    resultados = metodo_biseccion(f=mi_funcion, a=-2, b=-1, tol=0.001, decimales=6)