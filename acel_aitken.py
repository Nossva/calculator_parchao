import pandas as pd
import math
from typing import Callable, Dict, Any

def aceleracion_aitken(g: Callable[[float], float], x0: float, tol: float = 1e-6, max_iter: int = 100, decimales: int = 6) -> Dict[str, Any]:
    """
    Acelera la convergencia del método de punto fijo x = g(x) usando el proceso Delta-Cuadrado de Aitken.
    Incluye protección contra división por cero, desbordamiento y reporte visual.
    """
    # Variables de estado
    historial = []
    iteracion = 0
    p0 = x0
    error = float('inf')
    convergio = False
    divergio = False
    p_aitken = p0

    # 1. Bucle principal
    while error > tol and iteracion < max_iter:
        try:
            # Generamos los tres puntos necesarios para Aitken
            p1 = g(p0)
            if math.isnan(p1) or math.isinf(p1): raise OverflowError
            
            p2 = g(p1)
            if math.isnan(p2) or math.isinf(p2): raise OverflowError
            
            # Calculamos el denominador de la fórmula de Aitken
            denominador = p2 - 2 * p1 + p0
            
            # Evitamos la división por cero (si ocurre, p1 y p2 ya son la raíz exacta)
            if denominador == 0:
                p_aitken = p2
                error = 0.0
                convergio = True
            else:
                # Aplicamos la aceleración
                p_aitken = p0 - ((p1 - p0) ** 2) / denominador
                # El error se mide comparando el nuevo valor acelerado con el inicio del ciclo
                error = abs(p_aitken - p0)
                
        except OverflowError:
            divergio = True
            break

        # Registramos los datos en el historial
        historial.append({
            'Iter': iteracion + 1,
            'p0': p0,
            'p1 = g(p0)': p1,
            'p2 = g(p1)': p2,
            'p_aitken': p_aitken,
            'Error': error
        })

        if error <= tol or convergio:
            convergio = True
            p0 = p_aitken
            break

        # El nuevo punto de partida para el siguiente ciclo es el valor acelerado
        p0 = p_aitken
        iteracion += 1

    # 2. Preparación de datos finales
    df_historial = pd.DataFrame(historial)

    # ---------------------------------------------------------
    # 3. SECCIÓN DE PRESENTACIÓN VISUAL (Reporte en Consola)
    # ---------------------------------------------------------
    print("\n" + "="*80)
    print("🔍 REPORTE: ACELERACIÓN DE AITKEN (PUNTO FIJO)".center(80))
    print("="*80)
    
    # Resumen de estado
    if convergio:
        print(f"✅ Convergencia exitosa alcanzada en {iteracion + 1} ciclos de Aitken.")
    elif divergio:
        print(f"❌ ERROR: El método divergió. La función g(x) es demasiado inestable para Aitken.")
    else:
        print(f"⚠️ Límite de iteraciones ({max_iter}) alcanzado sin converger.")
    
    print("-" * 80)
    
    if not divergio and not df_historial.empty:
        print(f"📍 Raíz aproximada (x) :  {p_aitken:.{decimales}f}")
        print(f"📏 Error estimado      :  {error:.{decimales}f}")
    print(f"⚙️  Tolerancia objetivo :  {tol:.{decimales}f}")
    print("-" * 80)
    
    print("\n📋 HISTORIAL DE ITERACIONES:")
    
    if df_historial.empty:
        print("No se pudieron registrar iteraciones válidas.")
    else:
        # Copia y formato del DF
        df_visual = df_historial.copy()
        formato_str = f'{{:.{decimales}f}}' 
        
        columnas_formatear = ['p0', 'p1 = g(p0)', 'p2 = g(p1)', 'p_aitken', 'Error']
        for col in columnas_formatear:
            df_visual[col] = df_visual[col].map(formato_str.format)
        
        print(df_visual.to_string(index=False, justify='center'))
    
    print("="*80 + "\n")

    # 4. Retorno de los datos crudos
    return {
        "raiz_aproximada": p_aitken if not divergio else None,
        "convergio": convergio,
        "divergio": divergio,
        "iteraciones_realizadas": iteracion + 1 if convergio else iteracion,
        "error_final": error,
        "historial_df": df_historial 
    }

# ==========================================
# EJECUCIÓN DEL CÓDIGO
# ==========================================
if __name__ == "__main__":
    
    # Utilizamos la misma función del ejemplo anterior para comparar
    # f(x) = x^2 - x - 2 = 0  => x = sqrt(x + 2)
    def mi_funcion_gx(x: float) -> float:
        return math.sqrt(x + 2)

    # Si lo pruebas en tu entorno, notarás que Aitken necesita muchas
    # menos iteraciones para alcanzar la misma tolerancia que el Punto Fijo normal.
    resultados = aceleracion_aitken(g=mi_funcion_gx, x0=1.0, tol=0.0001, decimales=5)