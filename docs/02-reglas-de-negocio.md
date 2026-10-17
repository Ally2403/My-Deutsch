# 02 · Reglas de negocio

**RN-01 · Colores de género.** El color de un sustantivo depende del **género gramatical de su lema en singular**, no del artículo que aparece en el texto: masculino (*der*) = **azul**, neutro (*das*) = **verde**, femenino (*die*) = **rojo**. Un sustantivo en plural (*die Häuser*) se colorea con el género de su singular (*das Haus* → verde), y el panel muestra además el plural. Los sustantivos con más de un género (*der/das Teil*) muestran todos los artículos, y el color corresponde a la primera acepción de Wiktionary, con un indicador de "varios géneros". Los sustantivos solo plurales (*die Leute*) se muestran en gris con la etiqueta "solo plural". Los nombres propios no se colorean.

**RN-02 · Libro único por contenido.** Un libro se identifica por la huella SHA-256 de su PDF. Si un lector sube un PDF cuya huella ya existe, el sistema **no lo vuelve a procesar**: lo vincula al grupo destino y reutiliza el procesamiento existente.

**RN-03 · Visibilidad de libros.** Un libro solo es visible para los miembros de los grupos a los que está vinculado. Nunca existen libros públicos ni enlaces accesibles sin sesión.

**RN-04 · Privacidad de los datos personales.** El diccionario personal, el progreso de lectura y las respuestas a ejercicios pertenecen solo a su dueño. Ningún otro usuario, incluido el administrador del grupo, puede consultarlos.

**RN-05 · Registro automático de palabras vistas.** Cuando un lector abre el panel de una palabra, el lema queda guardado en su diccionario personal con estado **"vista"** (si no existía), se incrementa su contador de consultas y se guardan el libro, la página y la oración donde se consultó la primera vez. El lector puede cambiar el estado a **"conocida"** o eliminarla.

**RN-06 · El vocabulario se cuenta por lema.** La unidad del diccionario personal es el **lema más su tipo de palabra** (p. ej. *gehen*, verbo), no la forma del texto: consultar *ging*, *gegangen* o *gehst* afecta la misma entrada. *Die Bank* (banco, sustantivo) y *bank* no se mezclan si tienen tipos distintos.

**RN-07 · Verbos separables.** Si en una oración aparece una partícula separada del verbo (*Er **ruft** sie morgen **an***), ambas palabras se asocian al lema compuesto (*anrufen*). Tocar cualquiera de las dos muestra el verbo completo y resalta su pareja.

**RN-08 · Roles en el grupo.** Quien crea un grupo es su administrador. Cualquier miembro puede subir libros al grupo; solo quien lo subió o un administrador puede quitarlo. Un grupo siempre tiene al menos un administrador: si el último administrador sale, el rol pasa automáticamente al miembro más antiguo; si no quedan miembros, el grupo se elimina.

**RN-09 · Invitaciones.** Cada grupo tiene un código de invitación de 8 caracteres alfanuméricos (sin caracteres ambiguos como 0/O, 1/I) y un enlace equivalente. Solo el administrador puede regenerarlo; al hacerlo, el código anterior deja de funcionar. Un grupo admite hasta 50 miembros.

**RN-10 · Límites de subida y cola.** Se aceptan solo PDF de hasta 100 MB y 400 páginas. Cada usuario puede tener **un** libro en procesamiento a la vez. Los procesamientos se atienden en orden de llegada (FIFO).

**RN-11 · Eliminación de libros.** Cuando un libro deja de estar vinculado a cualquier grupo, sus archivos se eliminan después de 7 días (período de recuperación). Las entradas del diccionario personal se conservan, porque referencian el lema; su referencia de origen pasa a mostrarse como "libro eliminado". Las anotaciones de ese libro se eliminan junto con él.

**RN-12 · Significados mostrados.** El panel muestra como máximo **5 acepciones**, en el orden de Wiktionary. Las acepciones que provienen de traducción automática se marcan "traducción automática". Si el lema no existe en el diccionario, se muestra la forma tal como aparece y un enlace para buscarla externamente.

**RN-13 · Anotaciones.** Las respuestas escritas sobre una página son privadas (RN-04). Se guardan en coordenadas relativas a la página (0–1), para que se vean en el mismo lugar en cualquier tamaño de pantalla.

**RN-14 · Progreso de lectura.** El sistema guarda, por usuario y libro, la última página abierta; al volver al libro se abre en esa página. Una página cuenta como "leída" cuando el lector permanece en ella al menos 10 segundos.
