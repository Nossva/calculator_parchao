# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import numpy as np

# ============================================================
# MONTE CARLO CON SEMILLA - INTEGRAL DOBLE
# I = integral_0^1 integral_0^2 e^(3(x-y)) dy dx
# ============================================================

# Semilla para reproducibilidad (equivalente a np.random.seed(0) de Python)
np.random.seed(0)

# Parametros
n    = 10000
ax, bx = 0, 1    # limites de x
ay, by = 0, 2    # limites de y

# Generar muestras aleatorias
x = np.random.uniform(ax, bx, n)
y = np.random.uniform(ay, by, n)

# Evaluar f(x, y) = e^(3(x-y))
f_vals = np.exp(3 * (x - y))

# Area del dominio
area = (bx - ax) * (by - ay)   # = 2

# Estimacion de la integral
media    = np.mean(f_vals)
integral = area * media

# Estadisticas
varianza  = np.var(f_vals)
desv_std  = np.std(f_vals)
error_std = area * desv_std / np.sqrt(n)

# Intervalo de confianza 95% (z = 1.96)
z      = 1.96
ic_inf = integral - z * error_std
ic_sup = integral + z * error_std

# Valor analitico exacto
analitico = (1 - np.exp(-6)) * (np.exp(3) - 1) / 9

print("=" * 50)
print("  MONTE CARLO - INTEGRAL DOBLE  (seed = 0)")
print("=" * 50)
print(f"  Funcion          : e^(3(x-y))")
print(f"  Dominio x        : [{ax}, {bx}]")
print(f"  Dominio y        : [{ay}, {by}]")
print(f"  n muestras       : {n}")
print("-" * 50)
print(f"  Media muestral   : {media:.6f}")
print(f"  Varianza         : {varianza:.6f}")
print(f"  Desv. estandar   : {desv_std:.6f}")
print(f"  Error estandar   : {error_std:.6f}")
print("-" * 50)
print(f"  Integral MC      : {integral:.6f}")
print(f"  IC 95%           : [{ic_inf:.6f}, {ic_sup:.6f}]")
print("-" * 50)
print(f"  Valor analitico  : {analitico:.6f}")
print(f"  Error absoluto   : {abs(integral - analitico):.6f}")
print("=" * 50)
