/*
 * Datos editables del generador de fichas.
 * Todo lo que sea una regla, una raza o un texto de habilidad racial se cambia aquí,
 * sin tocar la lógica (js/logica.js) ni la interfaz (js/app.js).
 */
globalThis.DATOS = {

  /* ---------- Constantes del sistema ---------- */
  CONSTANTES: {
    puntosCompra: 27,
    valorMinimo: 8,
    valorMaximo: 15,
    // Coste ACUMULADO de cada valor base.
    costeAcumulado: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 },
    bonoProficiencia: 2,
    maxProficiencias: 4,
    acBase: 10, // AC sin armadura = acBase + modificador de Destreza (la raza/subraza puede definir su propio acBase)
    vidaMinima: 1,
    manaMinimo: 0,
    costeTrucos: '1-2',
    costeHechizosPotentes: 5,
    tiposMagia: {
      ninguna: { nombre: 'Ninguna', atributo: null },
      mago: { nombre: 'Mago', atributo: 'int' },
      druida: { nombre: 'Druida / Sacerdote', atributo: 'sab' },
      hechicero: { nombre: 'Hechicero', atributo: 'car' },
      brujo: { nombre: 'Brujo', atributo: 'car' }
    }
  },

  /* ---------- Atributos (el orden es el de la tabla) ---------- */
  ATRIBUTOS: [
    { id: 'fue', nombre: 'Fuerza', abreviatura: 'Fue' },
    { id: 'des', nombre: 'Destreza', abreviatura: 'Des' },
    { id: 'con', nombre: 'Constitución', abreviatura: 'Con' },
    { id: 'int', nombre: 'Inteligencia', abreviatura: 'Int' },
    { id: 'sab', nombre: 'Sabiduría', abreviatura: 'Sab' },
    { id: 'car', nombre: 'Carisma', abreviatura: 'Car' }
  ],

  /* ---------- Las 18 habilidades de BG3 ---------- */
  HABILIDADES: [
    { id: 'atletismo', nombre: 'Atletismo', atributo: 'fue' },
    { id: 'acrobacias', nombre: 'Acrobacias', atributo: 'des' },
    { id: 'juego_de_manos', nombre: 'Juego de manos', atributo: 'des' },
    { id: 'sigilo', nombre: 'Sigilo', atributo: 'des' },
    { id: 'arcanos', nombre: 'Arcanos', atributo: 'int' },
    { id: 'historia', nombre: 'Historia', atributo: 'int' },
    { id: 'investigacion', nombre: 'Investigación', atributo: 'int' },
    { id: 'naturaleza', nombre: 'Naturaleza', atributo: 'int' },
    { id: 'religion', nombre: 'Religión', atributo: 'int' },
    { id: 'trato_animales', nombre: 'Trato con animales', atributo: 'sab' },
    { id: 'perspicacia', nombre: 'Perspicacia', atributo: 'sab' },
    { id: 'medicina', nombre: 'Medicina', atributo: 'sab' },
    { id: 'percepcion', nombre: 'Percepción', atributo: 'sab' },
    { id: 'supervivencia', nombre: 'Supervivencia', atributo: 'sab' },
    { id: 'enganio', nombre: 'Engaño', atributo: 'car' },
    { id: 'intimidacion', nombre: 'Intimidación', atributo: 'con' },
    { id: 'interpretacion', nombre: 'Interpretación', atributo: 'car' },
    { id: 'persuasion', nombre: 'Persuasión', atributo: 'car' }
  ],

  /*
   * ---------- Razas ----------
   * Campos de una raza (o subraza; la subraza se suma a la raza):
   *   nombre, vidaBase, manaBase     La subraza prevalece sobre la raza si lo define.
   *   acBase                         AC base sin armadura (por defecto CONSTANTES.acBase).
   *   bonoMana                       Bonificación racial de maná (se suma, por defecto 0).
   *   bonos                          Bonificaciones fijas de atributo, p. ej. { con: 2 }.
   *   eleccionesAtributo             { cantidad, obligatorio, bono, excluir[] }
   *                                  obligatorio:true exige exactamente `cantidad` atributos;
   *                                  false permite entre 0 y `cantidad`.
   *   proficiencias                  Lista de proficiencias raciales:
   *     { id, origen, tipo: 'fija', habilidad, cuentaParaLimite }
   *     { id, origen, tipo: 'eleccion', opciones: [ids] | 'todas', cuentaParaLimite }
   *     `cuentaParaLimite: true` hace que gaste una de las 4 casillas propias.
   *   habilidades                    Tarjetas informativas { nombre, texto }.
   *   subrazas                       Mapa id -> subraza (mismos campos).
   */
  RAZAS: {
    humano: {
      nombre: 'Humano',
      vidaBase: 10,
      manaBase: 8,
      eleccionesAtributo: { cantidad: 2, obligatorio: true, bono: 1, excluir: [] },
      proficiencias: [
        { id: 'humano_habilidoso', origen: 'Habilidoso', tipo: 'eleccion', opciones: 'todas', cuentaParaLimite: false }
      ],
      habilidades: [
        { nombre: 'Espíritu humano', texto: 'Puedes darte ventaja en una tirada una vez por descanso.' },
        { nombre: 'Habilidoso', texto: 'Puedes escoger una proficiencia extra en cualquier habilidad.' }
      ]
    },

    enano: {
      nombre: 'Enano',
      vidaBase: 12,
      acBase: 12, // Armadura natural
      bonos: { con: 2 },
      habilidades: [
        { nombre: 'Armadura natural', texto: 'Tu piel es resistente como el cuero. Cuando no llevas armadura, tu AC es 12 + tu bonificador de Destreza. Funciona con escudos o armas defensivas.' }
      ],
      subrazas: {
        barbabronce: {
          nombre: 'Barbabronce',
          manaBase: 4,
          bonos: { sab: 1 },
          habilidades: [
            { nombre: 'Forma de piedra', texto: 'Una vez por descanso puedes usar una reacción para tirar 1d12 + tu bonificador de Constitución y reducir el daño recibido en esa cantidad. Elimina sangrados.' }
          ]
        },
        martillo_salvaje: {
          nombre: 'Martillo salvaje',
          manaBase: 6,
          bonos: { fue: 1 },
          proficiencias: [
            { id: 'martillo_salvaje_grifos', origen: 'Jinete de grifos', tipo: 'fija', habilidad: 'trato_animales', cuentaParaLimite: false }
          ],
          habilidades: [
            { nombre: '[Corazón indomable]', texto: 'Ventaja en salvaciones contra miedo.' },
            { nombre: '[Jinete de grifos]', texto: 'Proficiencia en Trato con animales (no cuenta para las cuatro habilidades a escoger).' }
          ]
        }
      }
    },

    elfo: {
      nombre: 'Elfo',
      vidaBase: 10,
      bonos: { des: 2 },
      subrazas: {
        kaldorei: {
          nombre: "Kal'dorei",
          manaBase: 10,
          bonos: { sab: 1 },
          habilidades: [
            { nombre: 'Aliado de la naturaleza', texto: 'Ventaja en salvaciones contra venenos, y recibes la mitad de daño de veneno y de naturaleza.' },
            { nombre: 'Fusión con las sombras', texto: 'Ventaja en Sigilo en zonas levemente iluminadas.' }
          ]
        },
        queldorei: {
          nombre: "Quel'dorei",
          manaBase: 10,
          bonoMana: 2,
          bonos: { int: 1 },
          habilidades: [
            { nombre: 'Legado arcano', texto: 'Tu bonificación a lanzar hechizos como ataques, salvaciones y reserva de maná es +2.' },
            { nombre: 'Sentido mágico', texto: 'Ventaja en tiradas de Arcanos.' }
          ]
        },
        altonato: {
          nombre: 'Altonato',
          manaBase: 12,
          bonos: { int: 1 },
          habilidades: [
            { nombre: 'Bendición arcana', texto: 'Resistencia al daño arcano (recibe la mitad de daño).' },
            { nombre: 'Afinidad arcana', texto: 'Haces un dado de daño adicional por cada dado de daño de tus hechizos.' }
          ]
        }
      }
    },

    gnomo: {
      nombre: 'Gnomo',
      vidaBase: 8,
      manaBase: 8,
      bonos: { int: 2, con: -1 },
      habilidades: [
        { nombre: 'Artista del escape', texto: 'Ventaja en tiradas para liberarte de ataduras físicas o mágicas.' },
        { nombre: 'Inteligencia del gnomo', texto: 'Ventaja en salvaciones mágicas de Inteligencia, Sabiduría o Carisma.' }
      ]
    },

    goblin: {
      nombre: 'Goblin',
      vidaBase: 8,
      manaBase: 6,
      bonos: { int: 2, car: 1 },
      proficiencias: [
        { id: 'goblin_precios', origen: 'Los mejores precios', tipo: 'fija', habilidad: 'persuasion', cuentaParaLimite: false }
      ],
      habilidades: [
        { nombre: 'KABOM', texto: 'Resistencia al daño explosivo.' },
        { nombre: 'Los mejores precios', texto: 'Proficiencia en Persuasión (no cuenta para las cuatro habilidades a escoger).' }
      ]
    },

    orco: {
      nombre: 'Orco',
      vidaBase: 12,
      manaBase: 6,
      bonos: { fue: 2, con: 1 },
      eleccionesAtributo: { cantidad: 1, obligatorio: false, bono: 1, excluir: ['fue', 'con'] },
      habilidades: [
        { nombre: '[Presencia intimidante]', texto: 'Ventaja en tiradas de Intimidación.' },
        { nombre: '[Aguante implacable]', texto: 'Una vez por descanso, cuando tu vida llega a cero, puedes seguir luchando hasta que te vuelvan a golpear.' }
      ]
    },

    tauren: {
      nombre: 'Tauren',
      vidaBase: 14,
      manaBase: 8,
      bonos: { fue: 2, sab: 1 },
      proficiencias: [
        { id: 'tauren_conexion', origen: 'Conexión con la tierra', tipo: 'eleccion', opciones: ['naturaleza', 'percepcion'], cuentaParaLimite: false }
      ],
      habilidades: [
        { nombre: '[Conexión con la tierra]', texto: 'Puedes elegir proficiencia en Naturaleza o en Percepción.' },
        { nombre: 'Carga', texto: 'Una vez por combate puedes cargar contra un enemigo. Si falla una salvación de Destreza, queda aturdido. Si la supera, recibe el daño (1d8) sin quedar aturdido.' }
      ]
    },

    trol: {
      nombre: 'Trol',
      vidaBase: 12,
      manaBase: 6,
      bonos: { des: 1, con: 1 },
      habilidades: [
        { nombre: 'Regeneración rápida', texto: 'Entre combates recuperas 2d4 de vida. Puedes regenerar miembros cortados tras una semana (excepto la cabeza).' }
      ],
      subrazas: {
        bosque: {
          nombre: 'Trol de bosque',
          bonos: { des: 1 },
          proficiencias: [
            { id: 'trol_bosque_cazador', origen: 'Cazador de la selva', tipo: 'eleccion', opciones: ['intimidacion', 'sigilo'], cuentaParaLimite: false }
          ],
          habilidades: [
            { nombre: '[Cazador de la selva]', texto: 'Proficiencia en Intimidación o Sigilo.' }
          ]
        },
        hielo: {
          nombre: 'Trol de hielo',
          bonos: { con: 1, fue: 1 },
          habilidades: [
            { nombre: '[Piel gélida]', texto: 'Resistencia al frío.' }
          ]
        },
        arena: {
          nombre: 'Trol de arena',
          bonos: { con: 1, fue: 1 },
          habilidades: [
            { nombre: '[Piel ardiente]', texto: 'Resistencia al fuego.' }
          ]
        }
      }
    }
  }
};
