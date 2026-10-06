# SINOX v2

Versión experimental separada de la v1 pública.

## Qué hace
- Genera automáticamente una selección diaria de 100 obras.
- Intenta equilibrar 10 categorías, 10 piezas por categoría.
- Usa únicamente resultados marcados como dominio público por la API pública de The Metropolitan Museum of Art.
- Guarda la selección del día en el navegador para no reconstruirla en cada visita.
- Precarga las 3 imágenes siguientes.
- Mantiene swipe NO/SÍ y el resumen final “Tus SÍ”.

## Archivos
- `index.html`: interfaz.
- `style.css`: diseño.
- `config.js`: reglas fáciles de modificar.
- `app.js`: motor.

## Importante
Esta v2 consulta la API del museo desde el navegador. La primera carga de cada día necesita conexión y puede tardar más que las siguientes. La v1 pública no debe sustituirse hasta probar esta versión.
