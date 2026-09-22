import type { LandingConfig, LandingElemento } from '../types/landing'

// Convierte el lienzo a un documento HTML equivalente. No pretende ser perfecto:
// es un PUNTO DE PARTIDA editable, con la misma geometria que ya tenias.
// Solo se traducen los elementos que se pueden representar sin el motor del editor;
// lo que no, se deja anotado como comentario para que se vea que falta.

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function estiloDe(el: LandingElemento): string {
  const g = el.geometria.escritorio
  const e = el.estilo
  const p: string[] = [
    'position:absolute',
    `left:${Math.round(g.x)}px`, `top:${Math.round(g.y)}px`,
    `width:${Math.round(g.w)}px`, `height:${Math.round(g.h)}px`,
    `z-index:${g.z ?? 1}`,
  ]
  if (e.bgColor) p.push(`background:${e.bgColor}`)
  if (e.color) p.push(`color:${e.color}`)
  if (e.radio) p.push(`border-radius:${e.radio}px`)
  if (e.opacidad != null && e.opacidad !== 1) p.push(`opacity:${e.opacidad}`)
  if (e.fontSize) p.push(`font-size:${e.fontSize}px`)
  if (e.fontWeight) p.push(`font-weight:${e.fontWeight}`)
  if (e.fontFamily) p.push(`font-family:${e.fontFamily},sans-serif`)
  if (e.textAlign) p.push(`text-align:${e.textAlign}`)
  if (e.borde?.ancho) p.push(`border:${e.borde.ancho}px solid ${e.borde.color}`)
  return p.join(';')
}

function elementoAHtml(el: LandingElemento, urls: Record<string, string>): string {
  const st = estiloDe(el)
  const c = el.contenido
  switch (el.tipo) {
    case 'texto': {
      const tag = String(c.tag || 'div')
      return `    <${tag} style="${st};margin:0">${esc(c.texto)}</${tag}>`
    }
    case 'boton': {
      const href = c.accion === 'whatsapp' ? `https://wa.me/${esc(c.telefono)}`
        : c.accion === 'email' ? `mailto:${esc(c.email)}` : esc(c.href)
      return `    <a href="${href}" style="${st};display:flex;align-items:center;justify-content:center;text-decoration:none">${esc(c.texto)}</a>`
    }
    case 'imagen': {
      const src = urls[String(c.src || '')] || String(c.src || '')
      return src
        ? `    <img src="${esc(src)}" alt="${esc(c.alt)}" style="${st};object-fit:${el.estilo.ajuste || 'cover'}">`
        : `    <!-- imagen sin archivo -->`
    }
    case 'bloque':
      return `    <div style="${st}"></div>`
    case 'html':
      return `    <div style="${st}">${String(c.html ?? '')}</div>`
    default:
      return `    <!-- ${el.tipo}: este bloque lo arma el editor; aqui tendrias que rehacerlo a mano -->`
  }
}

export function lienzoAHtml(config: LandingConfig, urls: Record<string, string> = {}): string {
  const ancho = config.pagina?.maxWidth ?? 900
  const cuerpo = config.secciones.map((sec) => {
    const alto = sec.altura?.escritorio ?? 580
    const fondo = sec.fondo?.tipo === 'color' ? (sec.fondo.valor || '#0E1411') : '#0E1411'
    const els = sec.elementos
      .slice()
      .sort((a, b) => (a.geometria.escritorio.z ?? 0) - (b.geometria.escritorio.z ?? 0))
      .map((el) => elementoAHtml(el, urls))
      .join('\n')
    return `  <section style="position:relative;width:100%;height:${alto}px;background:${fondo};overflow:hidden">\n${els}\n  </section>`
  }).join('\n')

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(config.slug || 'Mi landing')}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#0A0A0A;color:#EAF3EA;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
  .lienzo{max-width:${ancho}px;margin:0 auto}
  img{display:block}
</style>
</head>
<body>
<div class="lienzo">
${cuerpo}
</div>
</body>
</html>
`
}
