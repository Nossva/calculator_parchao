import pandas as pd
import math
from typing import Callable, Dict, Any

def metodo_newton_raphson(f: Callable[[float], float], df: Callable[[float], float], x0: float, tol: float = 1e-6, max_iter: int = 100, decimales: int = 6) -> Dict[str, Any]:
    """
    Encuentra la raíz de una función f(x) usando el método de Newton-Raphson.
    Requiere la función original y su derivada analítica.
    """
    # Variables de estado
    historial = []
    iteracion = 0
    x_actual = x0
    error = float('inf') 
    convergio = False
    divergio = False
    error_derivada = False

    # 1. Bucle principal
    while error > tol and iteracion < max_iter:
        try:
            # Evaluamos la función y su derivada
            fx = f(x_actual)
            dfx = df(x_actual)
            
            # Protección contra división por cero (tangente horizontal)
            if dfx == 0:
                error_derivada = True
                break
                
            # Calculamos el siguiente valor usando la fórmula de Newton-Raphson
            x_siguiente = x_actual - (fx / dfx)
            
            # Verificamos desbordamiento numérico
            if math.isnan(x_siguiente) or math.isinf(x_siguiente):
                raise OverflowError
                
        except OverflowError:
            divergio = True
            break

        # Calculamos el error absoluto
        error = abs(x_siguiente - x_actual)

        # Registramos los datos
        historial.append({
            'Iter': iteracion + 1,
            'x_i': x_actual,
            'f(x_i)': fx,
            "f'(x_i)": dfx,
            'x_i+1': x_siguiente,
            'Error': error
        })

        # Criterio de parada
        if error <= tol or fx == 0:
            convergio = True
            x_actual = x_siguiente
            break

        # Actualizamos para el siguiente ciclo
        x_actual = x_siguiente
        iteracion += 1

    # 2. Preparación de datos finales
    df_historial = pd.DataFrame(historial)

    # ---------------------------------------------------------
    # 3. SECCIÓN DE PRESENTACIÓN VISUAL (Reporte en Consola)
    # ---------------------------------------------------------
    print("\n" + "="*80)
    print("🔍 REPORTE: MÉTODO DE NEWTON-RAPHSON".center(80))
    print("="*80)
    
    # Resumen de estado
    if convergio:
        print(f"✅ Convergencia exitosa alcanzada en {iteracion + 1} iteraciones.")
    elif error_derivada:
        print(f"❌ ERROR CATASTRÓFICO: La derivada se hizo cero en x = {x_actual}. División por cero.")
    elif divergio:
        print(f"❌ ERROR: El método divergió (tendencia al infinito).")
    else:
        print(f"⚠️ Límite de iteraciones ({max_iter}) alcanzado sin converger.")
    
    print("-" * 80)
    
    if (convergio or not df_historial.empty) and not error_derivada and not divergio:
        print(f"📍 Raíz aproximada (x) :  {x_actual:.{decimales}f}")
        print(f"📏 Error estimado      :  {error:.{decimales}f}")
    print(f"⚙️  Tolerancia objetivo :  {tol:.{decimales}f}")
    print("-" * 80)
    
    print("\n📋 HISTORIAL DE ITERACIONES:")
    
    if df_historial.empty:
        print("No se pudieron registrar iteraciones válidas.")
    else:
        df_visual = df_historial.copy()
        formato_str = f'{{:.{decimales}f}}' 
        
        columnas_formatear = ['x_i', 'f(x_i)', "f'(x_i)", 'x_i+1', 'Error']
        for col in columnas_formatear:
            df_visual[col] = df_visual[col].map(formato_str.format)
        
        print(df_visual.to_string(index=False, justify='center'))
    
    print("="*80 + "\n")

    # 4. Retorno de los datos crudos
    return {
        "raiz_aproximada": x_actual if (convergio or iteracion > 0) and not error_derivada else None,
        "convergio": convergio,
        "divergio": divergio,
        "error_derivada": error_derivada,
        "iteraciones_realizadas": iteracion + 1 if convergio else iteracion,
        "error_final": error,
        "historial_df": df_historial 
    }

# ==========================================
# EJECUCIÓN DEL CÓDIGO
# ==========================================
if __name__ == "__main__":
    
    # Definimos f(x) = x^3 - x - 2
    def f_original(x: float) -> float:
        return x**3 - x - 2

    # Definimos explícitamente su derivada f'(x) = 3x^2 - 1
    def f_derivada(x: float) -> float:
        return 3 * (x**2) - 1

    # Ejecutamos Newton-Raphson con valor inicial x0 = 1.5
    resultados = metodo_newton_raphson(
        f=f_original, 
        df=f_derivada, 
        x0=1.5, 
        tol=0.0001, 
        decimales=5
    )