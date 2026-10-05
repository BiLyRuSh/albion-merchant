# BiLyRuSh Albion Merchant V0.4

Aplicación estática en español para Americas. Conserva el escáner y añade Operaciones, Inventario, Entrenamiento y Ajustes. Sitio: https://bilyrush-albion-merchant.rushbily.chatgpt.site

## Uso

1. Revisa el banco de cada ciudad en Inventario. Los valores iniciales son históricos del documento del 4 de octubre de 2026, no una lectura actual del personaje.
2. En Ajustes, actualiza saldo, reservas, impuestos, tarifa de estación, retorno, Fame por craft y confirma los datos. Vacío significa desconocido; Gold no se convierte a silver.
3. Configura rutas: transporte físico o cotización real del Travel Planner con carga. Puedes indicar duración total, o una estimación propia de minutos por salto para usar el grafo terrestre.
4. En Operaciones compara el lote con compra local en Martlock, destinos de venta, modos de órdenes y objetivo de entrenamiento/beneficio. Guarda previsiones y resultados reales en el diario.

Los datos personales se guardan únicamente en localStorage de ese navegador; exportar/importar JSON permite trasladarlos. La app no opera en el juego ni altera inventario automáticamente.

## Cálculos y límites

- T4.0: dos Medium Hide y un Thick Leather producen un Worked Leather. La simulación recursiva redondea hacia abajo el retorno medio de cada ingrediente por pase. Es una aproximación de planificación, no una reproducción verificada del RNG del juego. Cobra estación en TODOS los pases.
- 420 Hide + 210 Thick Leather, RRR 36.7% y 13.5 silver/craft proyectan 329 cueros y 4,441.5 silver de estación. La sesión documentada registra pases que suman 324, pero inventario final de 327: diferencia de tres pendiente de reconciliar. No se fuerza la fórmula para ocultarla. Cotización de viaje 78,376 no implica pago confirmado; no consta venta final.
- Efectivo requerido incluye compras, estación, transporte y tarifas de creación de órdenes. Beneficio económico resta además el valor inicial de materiales propios y suma sobrantes valorados a reposición marginal. Los sobrantes no son efectivo. El inventario de cuero producido anteriormente no se vende automáticamente.
- AODP ofrece mejores precios observados y sus fechas, no un libro de órdenes que garantice llenar el lote. La profundidad manual calcula costo ponderado; profundidad insuficiente deja el total pendiente. Toda orden necesita objetivos manuales; no se estima su tiempo de llenado.
- Impuestos/tarifas desconocidos impiden recomendar una operación. Los modos de compra/venta aplican las tasas configuradas; Premium no las inventa. Reservas, silver comprometido, porcentaje máximo de capital y pérdida máxima de entrenamiento se respetan.
- Riesgo se muestra por exposición, sin inventar probabilidad de muerte ni prima en silver. La confianza nunca es alta en esta versión. "Mejor escenario estimado" sigue condicionado a ejecución, retornos y liquidez.

## Rutas y mantenimiento

`dist/routes-data.js` contiene 125 zonas y 444 conexiones dirigidas del componente terrestre Royal, extraídas de `ao-data/ao-bin-dumps/cluster/world.json` el 5 de octubre de 2026. Incluye procedencia y SHA-256 del archivo fuente. No usa la posición visual de ciudades como distancia.

`dist/routes.js` calcula un camino de mínimos saltos en ese grafo, excluyendo zonas rojas por defecto. No representa todos los recorridos del juego: excluye túneles, portales, Roads of Avalon e interiores de bancos/mercados. Los saltos no son metros ni garantizan el camino globalmente más rápido. Ida y vuelta para recoger materiales; ida para vender. Los tiempos y saltos manuales tienen precedencia. No incorpora montura, peso, amenazas dinámicas o estado de facción.

Para actualizar, descarga el `cluster/world.json` de la fuente, revisa cambios y ejecuta `python scripts/build-routes.py /ruta/world.json`; actualiza la fecha de extracción del script y revisa pruebas. No incluye código de otros planificadores.

Fuentes: [AODP API](https://www.albion-online-data.com/api/), [datos de conexiones](https://github.com/ao-data/ao-bin-dumps/blob/master/cluster/world.json). La regla exacta de retornos, tarifas actuales de mercado y sesión histórica siguen sujetas a confirmación en juego.

## Desarrollo y validación

Los archivos publicables están en `dist/`; no requieren compilación ni dependencias de ejecución. `economy.js` y `routes.js` separan cálculos de la interfaz. El escáner utiliza el endpoint West/Americas de AODP.

Con Node compatible con jsdom 30: `npm install` y `npm test`. `npm run test:core` no requiere dependencias. Las 36 pruebas cubren semántica del mercado, profundidad, caducidad, receta/pases, costos, inventario, capital, órdenes, grafo y flujos DOM (pestañas, persistencia, formularios, diario y fallos de red). La consulta real multi-material también devolvió datos válidos durante el desarrollo.

La UI usa diseño adaptable y tablas desplazables. Las pruebas DOM no sustituyen una revisión visual en un navegador de escritorio/móvil: esa revisión no se ha completado en este entorno. WebMCP es opcional y no bloquea la interfaz cuando el navegador no lo ofrece.
