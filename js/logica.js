/*
 * Lógica de la ficha, sin nada de DOM: reglas, normalización del estado y cálculos.
 * Los datos salen de data/razas.js (globalThis.DATOS).
 */
(function () {
  const { CONSTANTES, ATRIBUTOS, HABILIDADES, RAZAS } = globalThis.DATOS;

  const IDS_ATRIBUTO = ATRIBUTOS.map((a) => a.id);
  const IDS_HABILIDAD = HABILIDADES.map((h) => h.id);

  /* ---------- Utilidades ---------- */

  function modificador(total) {
    return Math.floor((total - 10) / 2);
  }

  function conSigno(n) {
    if (n > 0) return '+' + n;
    if (n < 0) return '−' + Math.abs(n);
    return '+0';
  }

  function costeTotal(base) {
    return IDS_ATRIBUTO.reduce((suma, id) => suma + CONSTANTES.costeAcumulado[base[id]], 0);
  }

  // Coste de subir un atributo de su valor actual al siguiente (null si ya está en el máximo).
  function costeSubida(valor) {
    if (valor >= CONSTANTES.valorMaximo) return null;
    return CONSTANTES.costeAcumulado[valor + 1] - CONSTANTES.costeAcumulado[valor];
  }

  /* ---------- Estado ---------- */

  function estadoInicial() {
    const base = {};
    IDS_ATRIBUTO.forEach((id) => { base[id] = CONSTANTES.valorMinimo; });
    return {
      nombre: '',
      ac: null,
      raza: '',
      subraza: '',
      magia: 'ninguna',
      base,
      eleccionesAtributo: [],
      proficienciasRaciales: {},
      proficienciasPropias: []
    };
  }

  /* ---------- Raza + subraza ---------- */

  function subrazasDe(raza) {
    return raza && raza.subrazas ? raza.subrazas : {};
  }

  // Combina raza y subraza en una sola descripción.
  function describirRaza(estado) {
    const raza = RAZAS[estado.raza] || null;
    if (!raza) return null;
    const sub = subrazasDe(raza)[estado.subraza] || null;

    const bonos = {};
    [raza.bonos, sub && sub.bonos].forEach((origen) => {
      Object.entries(origen || {}).forEach(([id, valor]) => {
        bonos[id] = (bonos[id] || 0) + valor;
      });
    });

    const tieneSubrazas = Object.keys(subrazasDe(raza)).length > 0;
    const vidaBase = sub && sub.vidaBase !== undefined ? sub.vidaBase : raza.vidaBase;
    const manaBase = sub && sub.manaBase !== undefined ? sub.manaBase : raza.manaBase;

    return {
      raza,
      sub,
      tieneSubrazas,
      subrazaPendiente: tieneSubrazas && !sub,
      bonos,
      eleccionesAtributo: (sub && sub.eleccionesAtributo) || raza.eleccionesAtributo || null,
      proficiencias: [].concat(raza.proficiencias || [], (sub && sub.proficiencias) || []),
      bonoMana: (raza.bonoMana || 0) + ((sub && sub.bonoMana) || 0),
      vidaBase,
      manaBase
    };
  }

  function opcionesDeProficiencia(def) {
    return def.opciones === 'todas' ? IDS_HABILIDAD : def.opciones;
  }

  // Habilidad concedida por una proficiencia racial, o '' si aún no se ha elegido.
  function habilidadDeProficiencia(def, estado) {
    if (def.tipo === 'fija') return def.habilidad;
    const elegida = estado.proficienciasRaciales[def.id];
    return elegida && opcionesDeProficiencia(def).includes(elegida) ? elegida : '';
  }

  /* ---------- Normalización: garantiza que el estado cumple todas las reglas ---------- */

  function normalizar(estado) {
    const inicial = estadoInicial();
    const e = estado;

    e.nombre = typeof e.nombre === 'string' ? e.nombre.slice(0, 60) : '';
    const ac = Number(e.ac);
    e.ac = e.ac === null || e.ac === '' || !Number.isFinite(ac) ? null : Math.max(0, Math.min(99, Math.round(ac)));

    if (!RAZAS[e.raza]) e.raza = '';
    if (!e.raza || !subrazasDe(RAZAS[e.raza])[e.subraza]) e.subraza = '';
    if (!CONSTANTES.tiposMagia[e.magia]) e.magia = 'ninguna';

    // Valores base: dentro de rango y sin pasarse del presupuesto de compra.
    const base = e.base && typeof e.base === 'object' ? e.base : {};
    e.base = {};
    IDS_ATRIBUTO.forEach((id) => {
      const v = Math.round(Number(base[id]));
      e.base[id] = Number.isFinite(v)
        ? Math.max(CONSTANTES.valorMinimo, Math.min(CONSTANTES.valorMaximo, v))
        : inicial.base[id];
    });
    if (costeTotal(e.base) > CONSTANTES.puntosCompra) e.base = inicial.base;

    const desc = describirRaza(e);

    // Elecciones de atributo de la raza.
    const cfg = desc && desc.eleccionesAtributo;
    const elegidos = Array.isArray(e.eleccionesAtributo) ? e.eleccionesAtributo : [];
    e.eleccionesAtributo = cfg
      ? [...new Set(elegidos)]
          .filter((id) => IDS_ATRIBUTO.includes(id) && !cfg.excluir.includes(id))
          .slice(0, cfg.cantidad)
      : [];

    // Proficiencias raciales elegidas.
    const previas = e.proficienciasRaciales && typeof e.proficienciasRaciales === 'object' ? e.proficienciasRaciales : {};
    e.proficienciasRaciales = {};
    const racialesActivas = new Set();
    let racialesQueCuentan = 0;
    (desc ? desc.proficiencias : []).forEach((def) => {
      if (def.tipo === 'eleccion' && opcionesDeProficiencia(def).includes(previas[def.id])) {
        e.proficienciasRaciales[def.id] = previas[def.id];
      }
      const hab = habilidadDeProficiencia(def, e);
      if (hab && !racialesActivas.has(hab)) {
        racialesActivas.add(hab);
        if (def.cuentaParaLimite) racialesQueCuentan++;
      }
    });

    // Proficiencias propias: sin duplicados, sin solaparse con las raciales y dentro del límite.
    const propias = Array.isArray(e.proficienciasPropias) ? e.proficienciasPropias : [];
    const maximoPropias = Math.max(0, CONSTANTES.maxProficiencias - racialesQueCuentan);
    e.proficienciasPropias = [...new Set(propias)]
      .filter((id) => IDS_HABILIDAD.includes(id) && !racialesActivas.has(id))
      .slice(0, maximoPropias);

    return e;
  }

  /* ---------- Cálculos ---------- */

  function desglose(base, terminos, resultado, minimo) {
    let texto = base.valor + ' base';
    terminos.forEach((t) => {
      if (t.valor === 0 && t.omitirSiCero) return;
      texto += (t.valor < 0 ? ' − ' : ' + ') + Math.abs(t.valor) + ' ' + t.etiqueta;
    });
    texto += ' = ' + resultado;
    if (minimo) texto += ' (mínimo ' + minimo.valor + ')';
    return texto;
  }

  function calcular(estado) {
    const desc = describirRaza(estado);
    const cfgElec = desc && desc.eleccionesAtributo;

    /* Atributos */
    const atributos = {};
    IDS_ATRIBUTO.forEach((id) => {
      const fijo = desc ? desc.bonos[id] || 0 : 0;
      const elegido = cfgElec && estado.eleccionesAtributo.includes(id) ? cfgElec.bono : 0;
      const racial = fijo + elegido;
      const total = estado.base[id] + racial;
      atributos[id] = {
        base: estado.base[id],
        racial,
        total,
        modificador: modificador(total),
        puedeSubir: costeSubida(estado.base[id]) !== null && costeSubida(estado.base[id]) <= CONSTANTES.puntosCompra - costeTotal(estado.base),
        puedeBajar: estado.base[id] > CONSTANTES.valorMinimo,
        elegible: !!cfgElec && !cfgElec.excluir.includes(id),
        elegido: elegido > 0
      };
    });

    const puntosGastados = costeTotal(estado.base);

    /* Elecciones de atributo */
    let eleccion = null;
    if (cfgElec) {
      const marcados = estado.eleccionesAtributo.length;
      eleccion = {
        cantidad: cfgElec.cantidad,
        obligatorio: cfgElec.obligatorio,
        bono: cfgElec.bono,
        excluir: cfgElec.excluir,
        marcados,
        completa: !cfgElec.obligatorio || marcados === cfgElec.cantidad,
        alMaximo: marcados >= cfgElec.cantidad
      };
    }

    /* Proficiencias */
    const proficienciasRaciales = (desc ? desc.proficiencias : []).map((def) => ({
      def,
      habilidad: habilidadDeProficiencia(def, estado)
    }));
    const racialPorHabilidad = {};
    let racialesQueCuentan = 0;
    proficienciasRaciales.forEach((p) => {
      if (p.habilidad && !racialPorHabilidad[p.habilidad]) {
        racialPorHabilidad[p.habilidad] = p.def;
        if (p.def.cuentaParaLimite) racialesQueCuentan++;
      }
    });
    const usadas = estado.proficienciasPropias.length + racialesQueCuentan;
    const alLimite = usadas >= CONSTANTES.maxProficiencias;

    const habilidades = {};
    HABILIDADES.forEach((h) => {
      const racial = !!racialPorHabilidad[h.id];
      const propia = estado.proficienciasPropias.includes(h.id);
      habilidades[h.id] = {
        origen: racial ? 'racial' : propia ? 'propia' : null,
        bono: atributos[h.atributo].modificador + (racial || propia ? CONSTANTES.bonoProficiencia : 0),
        bloqueada: racial || (!propia && alLimite)
      };
    });

    /* Vida */
    let vida = null;
    if (desc) {
      const modCon = atributos.con.modificador;
      const bruto = desc.vidaBase + modCon;
      const total = Math.max(CONSTANTES.vidaMinima, bruto);
      vida = {
        base: desc.vidaBase,
        total,
        texto: desglose({ valor: desc.vidaBase }, [{ valor: modCon, etiqueta: 'Con' }], total,
          bruto < CONSTANTES.vidaMinima ? { valor: CONSTANTES.vidaMinima } : null)
      };
    }

    /* Maná */
    let mana = null;
    const magia = CONSTANTES.tiposMagia[estado.magia];
    if (desc && magia.atributo) {
      const atributo = ATRIBUTOS.find((a) => a.id === magia.atributo);
      const modLanzamiento = atributos[magia.atributo].modificador;
      const bruto = (desc.manaBase || 0) + modLanzamiento + desc.bonoMana;
      const total = Math.max(CONSTANTES.manaMinimo, bruto);
      mana = {
        base: desc.manaBase || 0,
        total,
        subrazaPendiente: desc.manaBase === undefined,
        texto: desglose({ valor: desc.manaBase || 0 }, [
          { valor: modLanzamiento, etiqueta: atributo.abreviatura },
          { valor: desc.bonoMana, etiqueta: 'racial', omitirSiCero: true }
        ], total, bruto < CONSTANTES.manaMinimo ? { valor: CONSTANTES.manaMinimo } : null)
      };
    }

    /* Tarjetas de habilidades raciales, agrupadas por raza y por subraza */
    const tarjetas = [];
    if (desc) {
      if (desc.raza.habilidades && desc.raza.habilidades.length) {
        tarjetas.push({ titulo: desc.raza.nombre, habilidades: desc.raza.habilidades });
      }
      if (desc.sub && desc.sub.habilidades && desc.sub.habilidades.length) {
        tarjetas.push({ titulo: desc.sub.nombre, habilidades: desc.sub.habilidades });
      }
    }

    /* Pendientes para dar la ficha por completa */
    const pendientes = [];
    if (!desc) pendientes.push('Elige una raza.');
    if (desc && desc.subrazaPendiente) pendientes.push('Elige una subraza.');
    if (eleccion && !eleccion.completa) {
      pendientes.push('Marca ' + eleccion.cantidad + ' atributos para el +' + eleccion.bono +
        ' racial (' + eleccion.marcados + '/' + eleccion.cantidad + ').');
    }
    proficienciasRaciales.forEach((p) => {
      if (!p.habilidad) pendientes.push('Elige la proficiencia racial «' + p.def.origen + '».');
    });
    if (puntosGastados < CONSTANTES.puntosCompra) {
      pendientes.push('Quedan ' + (CONSTANTES.puntosCompra - puntosGastados) + ' puntos de atributo por repartir.');
    }

    return {
      descripcion: desc,
      atributos,
      puntosGastados,
      puntosRestantes: CONSTANTES.puntosCompra - puntosGastados,
      eleccion,
      proficienciasRaciales,
      habilidades,
      contador: { usadas, maximo: CONSTANTES.maxProficiencias },
      vida,
      mana,
      tarjetas,
      pendientes
    };
  }

  globalThis.Ficha = {
    modificador,
    conSigno,
    costeTotal,
    costeSubida,
    estadoInicial,
    describirRaza,
    subrazasDe,
    opcionesDeProficiencia,
    normalizar,
    calcular
  };
})();
