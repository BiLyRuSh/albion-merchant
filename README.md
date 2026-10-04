# BiLyRuSh Albion Merchant

Escáner externo de recursos para Albion Online Americas. Sin automatización del juego.

## Estado 0.3

Código del escáner corregido. Publicación en GitHub Pages y prueba end-to-end en navegador **pendientes**: el conector permite editar código, pero la configuración de Pages requiere una sesión de GitHub en el navegador. No se declara desplegado ni validado en Safari.

## Uso

Selecciona recurso, tier, encantamiento y cantidad. Pulsa **Escanear todos los markets**.

- Se muestran siempre Bridgewatch, Martlock, Lymhurst, Fort Sterling, Thetford y Caerleon.
- Buy Now = `sell_price_min`; Sell Now = `buy_price_max`.
- Cada lado muestra su propia antigüedad y estado. Cero equivale a dato ausente.
- El menor Buy Now destacado solo usa cotizaciones dentro del umbral seleccionado (15, 60 o 180 minutos).
- Los totales son precio unitario × cantidad; no garantizan disponibilidad de todo el lote, ni incluyen impuestos o transporte.
- Ordenación por compra, venta o antigüedad de compra. Timestamps UTC y fechas inválidas controladas.
- Encantamientos verificados contra el catálogo enlazado por AODP: `_LEVELn@n`; T2/T3 y bloques de piedra sin encantamiento; piedra sin .4.
- Las consultas tienen timeout de 15 segundos y mensajes de error recuperables.

## Archivos y pruebas

`index.html`: interfaz adaptable con tabla desplazable en pantallas pequeñas.
`market.js`: mapeo, normalización, antigüedad, selección y acceso a AODP.
`app.js`: presentación y estados de consulta.
`market.test.js`: pruebas con Node, sin dependencias.

```sh
node --test market.test.js
```

Verificado durante desarrollo: 10 pruebas aprobadas; 245 combinaciones de recursos coinciden con el catálogo; consulta HTTP real de T4_HIDE × seis ciudades devuelve JSON. Estas pruebas **no sustituyen** una prueba desde la web publicada ni confirman CORS en navegador.

## Publicación y validación pendientes

GitHub Pages: rama `main`, carpeta raíz. Después de publicarlo:

1. Abrir URL pública y escanear T4 Hide, cantidad 420.
2. Confirmar seis ciudades, edades separadas y guiones para cotizaciones ausentes.
3. Verificar el menor precio reciente, ordenación y selección de encantamientos.
4. Probar vista móvil y Safari real; comprobar conexión AODP desde el origen publicado.
5. Revisar consola y manejo de fallo de API antes de declarar P0 completo.

## Fuentes

- API: https://www.albion-online-data.com/api/
- Catálogo: https://github.com/ao-data/ao-bin-dumps/blob/master/formatted/items.txt

El siguiente paso de producto es la calculadora de refinado de Leather; todavía no calcula rentabilidad, Focus, Fame, inventario ni rutas.
