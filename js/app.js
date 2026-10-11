/*
 * Interfaz de la ficha: pinta el estado, recoge los eventos y guarda en localStorage.
 * Las reglas viven en js/logica.js y los datos en data/razas.js.
 */
(function () {
  const { CONSTANTES, ATRIBUTOS, HABILIDADES, RAZAS } = globalThis.DATOS;
  const F = globalThis.Ficha;

  const CLAVE_GUARDADO = 'fichaWarcraft.v1';
  const NOTA_COSTE_HECHIZOS =
    'Coste de hechizos: trucos ' + CONSTANTES.costeTrucos + ', hechizos potentes ' + CONSTANTES.costeHechizosPotentes;

  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nombreAtributo = (id) => ATRIBUTOS.find((a) => a.id === id).nombre;
  const nombreHabilidad = (id) => HABILIDADES.find((h) => h.id === id).nombre;

  let estado = cargar();
  let temporizadorMensaje = null;

  /* ---------- Guardado ---------- */

  function cargar() {
    try {
      const texto = localStorage.getItem(CLAVE_GUARDADO);
      if (texto) return F.normalizar(Object.assign(F.estadoInicial(), JSON.parse(texto)));
    } catch (error) { /* sin almacenamiento o datos corruptos: ficha nueva */ }
    return F.estadoInicial();
  }

  function guardar() {
    try { localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(estado)); } catch (error) { /* modo privado */ }
  }

  function mostrarMensaje(texto, error) {
    const el = $('mensaje');
    el.textContent = texto;
    el.classList.toggle('error', !!error);
    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(() => { el.textContent = ''; }, 5000);
  }

  /* ---------- Pintado ---------- */

  function rellenarSelectores() {
    $('raza').innerHTML = '<option value="">— Elige raza —</option>' +
      Object.entries(RAZAS).map(([id, r]) => '<option value="' + id + '">' + esc(r.nombre) + '</option>').join('');
    $('magia').innerHTML = Object.entries(CONSTANTES.tiposMagia).map(([id, m]) => {
      const lanzamiento = m.atributo ? ' (' + nombreAtributo(m.atributo) + ')' : '';
      return '<option value="' + id + '">' + esc(m.nombre + lanzamiento) + '</option>';
    }).join('');
  }

  function pintarCampos(c) {
    const nombre = $('nombre');
    if (nombre.value !== estado.nombre) nombre.value = estado.nombre;
    const ac = $('ac');
    const valorAc = estado.ac === null ? '' : String(estado.ac);
    if (ac.value !== valorAc) ac.value = valorAc;

    $('raza').value = estado.raza;
    $('magia').value = estado.magia;

    const subrazas = F.subrazasDe(RAZAS[estado.raza]);
    const hayIds = Object.keys(subrazas);
    $('campo-subraza').hidden = hayIds.length === 0;
    $('subraza').innerHTML = '<option value="">— Elige subraza —</option>' +
      hayIds.map((id) => '<option value="' + id + '">' + esc(subrazas[id].nombre) + '</option>').join('');
    $('subraza').value = estado.subraza;

    const el = $('pendientes');
    if (c.pendientes.length === 0) {
      el.className = 'pendientes completa';
      el.textContent = 'Ficha completa.';
    } else {
      el.className = 'pendientes';
      el.innerHTML = '<strong>Pendiente:</strong> ' + c.pendientes.map((p) => '<span>' + esc(p) + '</span>').join(' ');
    }
  }

  function pintarContadores(c) {
    $('contador-puntos').innerHTML = 'Puntos restantes: <strong>' + c.puntosRestantes + '</strong> / ' + CONSTANTES.puntosCompra;
    $('contador-habilidades').innerHTML = 'Habilidades: <strong>' + c.contador.usadas + '/' + c.contador.maximo + '</strong>';

    const aviso = $('aviso-eleccion');
    const e = c.eleccion;
    aviso.hidden = !e;
    if (e) {
      const bono = '+' + e.bono;
      aviso.classList.toggle('pendiente', !e.completa);
      aviso.textContent = e.obligatorio
        ? 'Raza: marca ' + e.cantidad + ' atributos distintos para recibir ' + bono + ' (' + e.marcados + '/' + e.cantidad + ').'
        : 'Raza: puedes marcar ' + e.cantidad + ' atributo' + (e.cantidad > 1 ? 's' : '') + ' más' +
          (e.excluir.length ? ' (distinto de ' + e.excluir.map(nombreAtributo).join(' y ') + ')' : '') +
          ' para recibir ' + bono + ' (' + e.marcados + '/' + e.cantidad + ').';
    }
  }

  function filaHabilidad(h, c) {
    const d = c.habilidades[h.id];
    const racial = d.origen === 'racial';
    const marcada = d.origen !== null;
    return '<li><label class="habilidad' + (racial ? ' racial' : '') + (marcada ? ' marcada' : '') + '">' +
      '<input type="checkbox" data-accion="habilidad" data-habilidad="' + h.id + '" data-foco="hab:' + h.id + '"' +
      (marcada ? ' checked' : '') + (d.bloqueada ? ' disabled' : '') + '>' +
      '<span class="nombre-habilidad">' + esc(h.nombre) + '</span>' +
      (racial ? '<span class="etiqueta-racial">Racial</span>' : '') +
      '<span class="bono-habilidad">' + F.conSigno(d.bono) + '</span></label></li>';
  }

  function pintarTabla(c) {
    const conEleccion = !!c.eleccion;
    const columnas = conEleccion ? 6 : 5;
    let html = '<thead><tr><th scope="col">Atributo</th><th scope="col">Base</th><th scope="col">Racial</th>' +
      (conEleccion ? '<th scope="col">Elegir</th>' : '') +
      '<th scope="col">Total</th><th scope="col">Mod.</th></tr></thead>';

    ATRIBUTOS.forEach((a) => {
      const d = c.atributos[a.id];
      const racial = d.racial === 0 ? '—' : F.conSigno(d.racial);
      html += '<tbody class="grupo-atributo"><tr class="fila-atributo">' +
        '<th scope="row">' + esc(a.nombre) + '</th>' +
        '<td data-label="Base"><div class="control-base">' +
          '<button type="button" data-accion="bajar" data-atributo="' + a.id + '" data-foco="bajar:' + a.id + '"' +
            ' aria-label="Bajar ' + esc(a.nombre) + '"' + (d.puedeBajar ? '' : ' disabled') + '>−</button>' +
          '<output class="valor-base" aria-label="Valor base de ' + esc(a.nombre) + '">' + d.base + '</output>' +
          '<button type="button" data-accion="subir" data-atributo="' + a.id + '" data-foco="subir:' + a.id + '"' +
            ' aria-label="Subir ' + esc(a.nombre) + '"' + (d.puedeSubir ? '' : ' disabled') + '>+</button>' +
        '</div></td>' +
        '<td data-label="Racial" class="celda-racial' + (d.racial > 0 ? ' positivo' : d.racial < 0 ? ' negativo' : '') + '">' + racial + '</td>' +
        (conEleccion
          ? '<td data-label="Elegir" class="celda-eleccion">' + (d.elegible
              ? '<input type="checkbox" data-accion="elegir" data-atributo="' + a.id + '" data-foco="elegir:' + a.id + '"' +
                ' aria-label="+' + c.eleccion.bono + ' racial a ' + esc(a.nombre) + '"' +
                (d.elegido ? ' checked' : '') + (!d.elegido && c.eleccion.alMaximo ? ' disabled' : '') + '>'
              : '') + '</td>'
          : '') +
        '<td data-label="Total" class="celda-total">' + d.total + '</td>' +
        '<td data-label="Mod." class="celda-mod">' + F.conSigno(d.modificador) + '</td></tr>';

      const habilidades = HABILIDADES.filter((h) => h.atributo === a.id);
      if (habilidades.length) {
        html += '<tr class="fila-habilidades"><td colspan="' + columnas + '"><ul class="lista-habilidades">' +
          habilidades.map((h) => filaHabilidad(h, c)).join('') + '</ul></td></tr>';
      }
      html += '</tbody>';
    });
    $('tabla-atributos').innerHTML = html;
    $('tabla-atributos').classList.toggle('con-eleccion', conEleccion);
  }

  function pintarRecursos(c) {
    const d = c.descripcion;
    let html = '<div class="recurso"><div class="recurso-cabecera"><span class="recurso-nombre">Vida</span>' +
      '<strong class="recurso-valor">' + (c.vida ? c.vida.total : '—') + '</strong></div>' +
      '<p class="desglose">' + (c.vida ? esc(c.vida.texto) : 'Elige una raza para calcularla.') + '</p></div>';

    if (estado.magia !== 'ninguna') {
      html += '<div class="recurso recurso-mana"><div class="recurso-cabecera"><span class="recurso-nombre">Maná</span>' +
        '<strong class="recurso-valor">' + (c.mana ? c.mana.total : '—') + '</strong></div>';
      if (c.mana) {
        html += '<p class="desglose">' + esc(c.mana.texto) + '</p>';
        if (c.mana.subrazaPendiente && d && d.tieneSubrazas) html += '<p class="desglose">Elige subraza para fijar el maná base.</p>';
      } else {
        html += '<p class="desglose">Elige una raza para calcularlo.</p>';
      }
      html += '<p class="nota">' + esc(NOTA_COSTE_HECHIZOS) + '</p></div>';
    }
    $('recursos').innerHTML = html;
  }

  function pintarProficienciasRaciales(c) {
    const lista = c.proficienciasRaciales;
    $('panel-prof-raciales').hidden = lista.length === 0;
    $('prof-raciales').innerHTML = lista.map((p) => {
      const def = p.def;
      const etiqueta = '<span class="prof-origen">' + esc(def.origen) + '</span>';
      if (def.tipo === 'fija') {
        return '<div class="prof-racial">' + etiqueta + '<span class="prof-fija">' + esc(nombreHabilidad(def.habilidad)) + ' · fija</span></div>';
      }
      const opciones = F.opcionesDeProficiencia(def).map((id) => {
        const ocupada = estado.proficienciasPropias.includes(id);
        return '<option value="' + id + '"' + (ocupada ? ' disabled' : '') + (p.habilidad === id ? ' selected' : '') + '>' +
          esc(nombreHabilidad(id)) + (ocupada ? ' (ya elegida)' : '') + '</option>';
      }).join('');
      return '<label class="prof-racial">' + etiqueta +
        '<select data-accion="prof-racial" data-id="' + def.id + '" data-foco="prof:' + def.id + '">' +
        '<option value="">— Elige —</option>' + opciones + '</select></label>';
    }).join('');
  }

  function pintarTarjetas(c) {
    $('tarjetas').innerHTML = c.tarjetas.length
      ? c.tarjetas.map((g) => '<div class="grupo-tarjetas"><h3>' + esc(g.titulo) + '</h3>' +
          g.habilidades.map((h) => '<article class="tarjeta"><h4>' + esc(h.nombre) + '</h4><p>' + esc(h.texto) + '</p></article>').join('') +
          '</div>').join('')
      : '<p class="nota">Elige una raza para ver sus habilidades.</p>';
  }

  function pintar() {
    const foco = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.foco : null;
    const c = F.calcular(estado);
    pintarCampos(c);
    pintarContadores(c);
    pintarTabla(c);
    pintarRecursos(c);
    pintarProficienciasRaciales(c);
    pintarTarjetas(c);
    if (foco) {
      const el = document.querySelector('[data-foco="' + foco + '"]');
      if (el && !el.disabled && el !== document.activeElement) el.focus();
    }
  }

  function actualizar() {
    F.normalizar(estado);
    guardar();
    pintar();
  }

  /* ---------- Eventos ---------- */

  function alternar(lista, id) {
    const i = lista.indexOf(id);
    if (i >= 0) lista.splice(i, 1); else lista.push(id);
  }

  $('tabla-atributos').addEventListener('click', (ev) => {
    const boton = ev.target.closest('button[data-accion]');
    if (!boton) return;
    const id = boton.dataset.atributo;
    const c = F.calcular(estado);
    if (boton.dataset.accion === 'subir' && c.atributos[id].puedeSubir) estado.base[id]++;
    else if (boton.dataset.accion === 'bajar' && c.atributos[id].puedeBajar) estado.base[id]--;
    else return;
    actualizar();
  });

  $('tabla-atributos').addEventListener('change', (ev) => {
    const caja = ev.target;
    if (caja.dataset.accion === 'elegir') alternar(estado.eleccionesAtributo, caja.dataset.atributo);
    else if (caja.dataset.accion === 'habilidad') alternar(estado.proficienciasPropias, caja.dataset.habilidad);
    else return;
    actualizar();
  });

  $('prof-raciales').addEventListener('change', (ev) => {
    if (ev.target.dataset.accion !== 'prof-racial') return;
    estado.proficienciasRaciales[ev.target.dataset.id] = ev.target.value;
    actualizar();
  });

  $('nombre').addEventListener('input', (ev) => {
    estado.nombre = ev.target.value;
    guardar();
  });

  $('ac').addEventListener('input', (ev) => {
    estado.ac = ev.target.value === '' ? null : Number(ev.target.value);
    guardar();
  });
  $('ac').addEventListener('change', (ev) => {
    F.normalizar(estado);
    ev.target.value = estado.ac === null ? '' : String(estado.ac);
    guardar();
  });

  $('raza').addEventListener('change', (ev) => {
    estado.raza = ev.target.value;
    estado.subraza = '';
    estado.eleccionesAtributo = [];
    estado.proficienciasRaciales = {};
    actualizar();
  });

  $('subraza').addEventListener('change', (ev) => {
    estado.subraza = ev.target.value;
    estado.eleccionesAtributo = [];
    estado.proficienciasRaciales = {};
    actualizar();
  });

  $('magia').addEventListener('change', (ev) => {
    estado.magia = ev.target.value;
    actualizar();
  });

  /* ---------- Imprimir, exportar, importar ---------- */

  $('btn-imprimir').addEventListener('click', () => window.print());

  $('btn-exportar').addEventListener('click', () => {
    const contenido = JSON.stringify({ version: 1, ficha: estado }, null, 2);
    const url = URL.createObjectURL(new Blob([contenido], { type: 'application/json' }));
    const nombre = (estado.nombre || 'personaje').trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'personaje';
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'ficha-' + nombre + '.json';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    mostrarMensaje('Ficha exportada.');
  });

  $('btn-importar').addEventListener('click', () => $('archivo-importar').click());

  $('archivo-importar').addEventListener('change', (ev) => {
    const archivo = ev.target.files[0];
    ev.target.value = '';
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const datos = JSON.parse(lector.result);
        const ficha = datos && typeof datos === 'object' && datos.ficha ? datos.ficha : datos;
        if (!ficha || typeof ficha !== 'object' || Array.isArray(ficha)) throw new Error('Formato no válido');
        estado = F.normalizar(Object.assign(F.estadoInicial(), ficha));
        guardar();
        pintar();
        mostrarMensaje('Ficha importada.');
      } catch (error) {
        mostrarMensaje('No se ha podido importar: el archivo no es una ficha válida.', true);
      }
    };
    lector.onerror = () => mostrarMensaje('No se ha podido leer el archivo.', true);
    lector.readAsText(archivo);
  });

  $('btn-reiniciar').addEventListener('click', () => {
    if (!window.confirm('¿Empezar una ficha nueva? Se perderán los datos actuales (exporta antes la ficha si quieres conservarla).')) return;
    estado = F.estadoInicial();
    actualizar();
    mostrarMensaje('Ficha nueva.');
  });

  /* ---------- Arranque ---------- */

  rellenarSelectores();
  pintar();
})();
