import pandas as pd
import math
from typing import Callable, Dict, Any

def metodo_punto_fijo(g: Callable[[float], float], x0: float, tol: float = 1e-6, max_iter: int = 100, decimales: int = 6) -> Dict[str, Any]:
    """
    Encuentra la raíz de una función reescrita como x = g(x) usando el método de Iteración de Punto Fijo.
    Incluye manejo de divisiones por cero, desbordamientos y formato automático a notación científica.
    """
    historial = []
    iteracion = 0
    x_actual = x0
    error = float('inf')
    convergio = False
    divergio = False
    motivo_error = ""

    while error > tol and iteracion < max_iter:
        try:
            # Calculamos el siguiente valor
            x_siguiente = g(x_actual)
            
            # Verificamos si el resultado es un número válido (NaN o Infinito)
            if math.isnan(x_siguiente) or math.isinf(x_siguiente):
                raise OverflowError
                
        except ZeroDivisionError:
            divergio = True
            motivo_error = "División por cero"
            break
        except OverflowError:
            divergio = True
            motivo_error = "Desbordamiento (Número demasiado grande)"
            break

        # Calculamos el error absoluto
        error = abs(x_siguiente - x_actual)

        # Registramos en el historial
        historial.append({
            'Iter': iteracion + 1,
            'x_i (actual)': x_actual,
            'g(x_i) (siguiente)': x_siguiente,
            'Error': error
        })

        if error <= tol:
            convergio = True
            x_actual = x_siguiente
            break

        # Siguiente iteración
        x_actual = x_siguiente
        iteracion += 1

    # Preparación de datos finales
    df_historial = pd.DataFrame(historial)

    # ---------------------------------------------------------
    # REPORTE VISUAL
    # ---------------------------------------------------------
    print("\n" + "="*70)
    print("🔍 REPORTE: MÉTODO DE PUNTO FIJO".center(70))
    print("="*70)
    
    if convergio:
        print(f"✅ Convergencia exitosa alcanzada en {len(historial)} iteraciones.")
    elif divergio:
        print(f"❌ ERROR: El método falló debido a: {motivo_error}.")
        print(f"   Último valor de x antes del error: {x_actual:.{decimales}g}")
    else:
        print(f"⚠️ Límite de iteraciones ({max_iter}) alcanzado sin converger.")
    
    print("-" * 70)
    
    # Resumen usando formato 'g' para notación científica automática
    if not divergio and not df_historial.empty:
        print(f"📍 Raíz aproximada (x) :  {x_actual:.{decimales}g}")
        print(f"📏 Error final        :  {error:.{decimales}g}")
    
    print(f"⚙️  Tolerancia objetivo :  {tol:.{decimales}g}")
    print("-" * 70)
    
    print("\n📋 HISTORIAL DE ITERACIONES:")
    if not df_historial.empty:
        df_visual = df_historial.copy()
        
        # Función para aplicar el formato dinámico a las columnas
        def formatear_valor(val):
            return f"{val:.{decimales}g}"
        
        for col in ['x_i (actual)', 'g(x_i) (siguiente)', 'Error']:
            df_visual[col] = df_visual[col].apply(formatear_valor)
        
        print(df_visual.to_string(index=False, justify='center'))
    else:
        print("No se generaron iteraciones.")
    
    print("="*70 + "\n")

    return {
        "raiz_aproximada": x_actual if convergio else None,
        "convergio": convergio,
        "divergio": divergio,
        "iteraciones": len(historial),
        "historial_df": df_historial 
    }

# ==========================================
# DEFINICIÓN DE LA FUNCIÓN Y EJECUCIÓN
# ==========================================
if __name__ == "__main__":
    
    # Función g(x) que diverge
    def mi_funcion_gx(x: float) -> float:
        return (5/(x**2)) + 2

    # Ejecución
    resultados = metodo_punto_fijo(
        g=mi_funcion_gx, 
        x0=1, 
        tol=0.001, 
        decimales=5, 
        max_iter=20 
    )