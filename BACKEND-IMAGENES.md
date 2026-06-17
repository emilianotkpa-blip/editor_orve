# Backend de imágenes — contrato n8n + Supabase Storage

El editor ya NO acepta URLs externas para imágenes: todo se sube como archivo a
Supabase Storage y se muestra vía **signed URL**. Para que funcione hacen falta
**2 webhooks nuevos** en n8n y **1 ajuste** al webhook público existente.

Base actual: `https://bonos-n8n-agentes-ia.be197l.easypanel.host/webhook`
Header en todas: `x-api-key: orve-dvd-2026-xK9m` · CORS `allowedOrigins: "*"`

> Las credenciales de Supabase viven SOLO en las credenciales de n8n.
> Nunca en el código del editor ni en git.

Bucket: privado (por eso se firman las URLs). Carpeta por asesor: `landing/{slug}/`.

---

## 1) `POST /dvd-landing-subir-imagen`  (NUEVO)

Recibe el archivo en base64 y lo guarda en Storage.

**Request**
```json
{
  "email": "marco.ruiz@orve.mx",
  "slug": "marco-ruiz",
  "filename": "foto.jpg",
  "mime": "image/jpeg",
  "data": "<base64 sin el prefijo data:>"
}
```

**Lógica del workflow**
1. Validar `mime ∈ {image/jpeg, image/png, image/webp}` y tamaño ≤ 5 MB
   (el editor ya valida, pero re-valida por seguridad).
2. Generar nombre único: `${Date.now()}-${random}.${ext}` (ext desde `mime`).
3. `path = "landing/" + slug + "/" + nombre`.
4. Decodificar base64 → subir a Supabase Storage en ese `path` (upsert).
5. Crear signed URL del `path` (p.ej. 1 año) para previsualización inmediata.

**Response**
```json
{ "ok": true, "path": "landing/marco-ruiz/1718400000-ab12.jpg", "signedUrl": "https://…" }
```
En error: `{ "ok": false, "error": "mensaje" }`

> `signedUrl` es opcional: si no la devuelves, el editor la pide a
> `/dvd-landing-firmar`. Devolverla evita un round-trip.

---

## 2) `POST /dvd-landing-firmar`  (NUEVO)

Firma un lote de paths de Storage (lo usa el editor al cargar la landing y como
fallback tras subir).

**Request**
```json
{ "paths": ["landing/marco-ruiz/1718400000-ab12.jpg", "landing/marco-ruiz/otro.png"] }
```

**Response**
```json
{ "signedUrls": {
  "landing/marco-ruiz/1718400000-ab12.jpg": "https://…",
  "landing/marco-ruiz/otro.png": "https://…"
} }
```
Las claves deben ser EXACTAMENTE los paths recibidos (el editor las usa como key).

---

## 3) Ajuste a `POST /dvd-landing-publica`  (EXISTENTE)

Ya devuelve `{ disponible, config, signedUrls }`. Hay que asegurar que `signedUrls`
incluya **todos** los paths de imagen del config, recorriendo:

- Elementos `tipo: "imagen"` → `contenido.src` (o `contenido.path`).
- Elementos `tipo: "galeria"` → cada path dentro de `contenido.imagenes` (array).

Cualquier valor que ya empiece por `http`/`blob`/`data` se deja igual (no se firma).

---

## Dónde se guarda el path en el config

- **Imagen** (foto asesor, proyectos): `contenido.src` y `contenido.path` = el path de Storage.
- **Galería**: `contenido.imagenes` = `string[]` de paths de Storage.

El editor nunca guarda URLs externas; solo paths. El render (canvas y página
pública) usa el mismo `ElementRenderer`, que resuelve path → signed URL con el
mapa `signedUrls`.
