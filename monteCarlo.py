import numpy as np
import pandas as pd
from typing import Callable, Dict, Any

def metodo_monte_carlo(f: Callable[[float], float], a: float, b: float, n_muestras: int = 10000, decimales: int = 6) -> Dict[str, Any]:
    """
    Estima la integral de una función f(x) en el intervalo [a, b] usando el método de Monte Carlo.
    
    Parámetros:
    -----------
    f : Callable[[float], float]
        La función a integrar
    a : float
        Límite inferior del intervalo
    b : float
        Límite superior del intervalo
    n_muestras : int
        Número de puntos aleatorios a generar (default: 10000)
    decimales : int
        Número de decimales para redondear resultados (default: 6)
    
    Retorna:
    --------
    Dict[str, Any]
        Diccionario con:
        - 'integral': valor estimado de la integral
        - 'n_muestras': número de muestras utilizadas
        - 'intervalo': tuple (a, b)
        - 'longitud_intervalo': b - a
        - 'historial': lista de muestras y valores
        - 'resumen': diccionario con estadísticas
    """
    
    # 1. Validaciones
    if a >= b:
        raise ValueError("Error: a debe ser menor que b")
    if n_muestras < 1:
        raise ValueError("Error: n_muestras debe ser al menos 1")
    
    # 2. Generar puntos aleatorios en el intervalo [a, b]
    x_aleatorios = np.random.uniform(a, b, n_muestras)
    
    # 3. Evaluar la función en cada punto
    f_valores = np.array([f(x) for x in x_aleatorios])
    
    # 4. Calcular la integral
    longitud_intervalo = b - a
    promedio_f = np.mean(f_valores)
    integral_estimada = longitud_intervalo * promedio_f
    
    # 5. Estadísticas
    f_min = np.min(f_valores)
    f_max = np.max(f_valores)
    f_desv_std = np.std(f_valores)
    
    # 6. Crear historial de muestras (primeras 10 y últimas 10 para brevedad)
    historial = []
    muestras_a_mostrar = min(10, n_muestras)
    
    for i in range(muestras_a_mostrar):
        historial.append({
            'Muestra': i + 1,
            'x': round(x_aleatorios[i], decimales),
            'f(x)': round(f_valores[i], decimales)
        })
    
    if n_muestras > 20:
        historial.append({
            'Muestra': '...',
            'x': '...',
            'f(x)': '...'
        })
    
    for i in range(max(muestras_a_mostrar, n_muestras - muestras_a_mostrar), n_muestras):
        historial.append({
            'Muestra': i + 1,
            'x': round(x_aleatorios[i], decimales),
            'f(x)': round(f_valores[i], decimales)
        })
    
    # 7. Crear DataFrame del historial
    df_historial = pd.DataFrame(historial)
    
    # 8. Reporte en consola
    print("\n" + "="*70)
    print("MÉTODO DE MONTE CARLO - INTEGRACIÓN NUMÉRICA")
    print("="*70)
    print(f"\nIntervalo: [{a}, {b}]")
    print(f"Longitud del intervalo: {longitud_intervalo}")
    print(f"Número de muestras: {n_muestras}")
    print(f"\n{'ESTIMACIÓN DE LA INTEGRAL':^70}")
    print("-"*70)
    print(f"Integral estimada: {round(integral_estimada, decimales)}")
    print(f"\n{'ESTADÍSTICAS':^70}")
    print("-"*70)
    print(f"Valor mínimo de f(x): {round(f_min, decimales)}")
    print(f"Valor máximo de f(x): {round(f_max, decimales)}")
    print(f"Promedio de f(x): {round(promedio_f, decimales)}")
    print(f"Desviación estándar: {round(f_desv_std, decimales)}")
    print(f"\n{'PRIMERAS Y ÚLTIMAS MUESTRAS':^70}")
    print("-"*70)
    print(df_historial.to_string(index=False))
    print("\n" + "="*70 + "\n")
    
    # 9. Retornar resultados
    return {
        'integral': round(integral_estimada, decimales),
        'n_muestras': n_muestras,
        'intervalo': (a, b),
        'longitud_intervalo': longitud_intervalo,
        'historial': historial,
        'resumen': {
            'f_min': round(f_min, decimales),
            'f_max': round(f_max, decimales),
            'f_promedio': round(promedio_f, decimales),
            'f_desv_std': round(f_desv_std, decimales)
        }
    }


# Ejemplo de uso
if __name__ == "__main__":
    # Ejemplo 1: Integrar f(x) = x^2 en [0, 1]
    def f1(x):
        return x**2
    
    resultado1 = metodo_monte_carlo(f1, 0, 1, n_muestras=100000)
    print(f"\nIntegral de x^2 en [0, 1]: {resultado1['integral']}")
    print(f"(Valor teórico: 0.333333)")
    
    # Ejemplo 2: Integrar f(x) = sin(x) en [0, π]
    import math
    def f2(x):
        return math.sin(x)
    
    resultado2 = metodo_monte_carlo(f2, 0, math.pi, n_muestras=100000)
    print(f"\nIntegral de sin(x) en [0, π]: {resultado2['integral']}")
    print(f"(Valor teórico: 2.0)")
    
    # Ejemplo 3: Aproximar π usando Monte Carlo
    print("\n" + "="*70)
    print("APROXIMACIÓN DE π USANDO MONTE CARLO")
    print("="*70)
    print("\nMétodo: Círculo inscrito en un cuadrado")
    print("Se generan puntos aleatorios en un cuadrado [0,1] x [0,1]")
    print("y se cuenta cuántos caen dentro del círculo de radio 1.\n")
    
    n_puntos = 1000000
    puntos_dentro = 0
    
    # Generar puntos aleatorios en el cuadrado [0,1] x [0,1]
    x_puntos = np.random.uniform(0, 1, n_puntos)
    y_puntos = np.random.uniform(0, 1, n_puntos)
    
    # Calcular distancia desde el origen
    distancias = np.sqrt(x_puntos**2 + y_puntos**2)
    
    # Contar puntos dentro del círculo (radio = 1)
    puntos_dentro = np.sum(distancias <= 1)
    
    # Aproximar π: área_círculo/área_cuadrado = (π*r²)/(lado²) = π/4
    # Por lo tanto: π ≈ 4 * (puntos_dentro / puntos_totales)
    pi_aproximado = 4 * puntos_dentro / n_puntos
    error = abs(pi_aproximado - math.pi)
    porcentaje_error = (error / math.pi) * 100
    
    print(f"Puntos totales generados: {n_puntos:,}")
    print(f"Puntos dentro del círculo: {puntos_dentro:,}")
    print(f"Puntos fuera del círculo: {n_puntos - puntos_dentro:,}")
    print(f"\nRazón (dentro/total): {puntos_dentro/n_puntos:.6f}")
    print(f"\nπ Aproximado: {pi_aproximado:.6f}")
    print(f"π Real:       {math.pi:.6f}")
    print(f"Error:        {error:.6f}")
    print(f"Error %:      {porcentaje_error:.4f}%")
    print("="*70)
