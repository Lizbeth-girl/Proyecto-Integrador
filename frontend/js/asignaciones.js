
const tabla = document.getElementById("tablaAsignaciones");
const formulario = document.getElementById("formAsignacion");
const panel = document.getElementById("panelFormulario");

const buscador = document.getElementById("buscarAsignacion");
const filtroEstado = document.getElementById("filtroEstado");

const selectorActividad = document.getElementById("actividad");
const selectorTrabajador = document.getElementById("trabajador");

let asignaciones = [];
let actividades = [];
let trabajadores = [];

// COMUNICACIÓN CON LA API
async function solicitar(url, opciones = {}) {
    const respuesta = await fetch(url, opciones);
    const tipo = respuesta.headers.get("content-type") || "";

    if (!tipo.includes("application/json")) {
        throw new Error(
            `Respuesta inválida del servidor (${respuesta.status})`
        );
    }

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.error || "Error en la solicitud");
    }

    return datos;
}

// CARGAR ACTIVIDADES Y TRABAJADORES
async function cargarOpciones() {
    const [datosActividades, datosTrabajadores] =
        await Promise.all([
            solicitar("/api/actividades"),
            solicitar("/api/trabajadores")
        ]);

    actividades = datosActividades;
    trabajadores = datosTrabajadores;

    selectorActividad.innerHTML =
        '<option value="">Seleccione una actividad</option>';

    actividades.forEach(actividad => {
        const opcion = document.createElement("option");

        opcion.value = actividad.id_actividad;
        opcion.textContent =
            `${actividad.nombre} — ${actividad.cultivo} — ${actividad.parcela}`;

        selectorActividad.appendChild(opcion);
    });

    selectorTrabajador.innerHTML =
        '<option value="">Seleccione un trabajador activo</option>';

    trabajadores
        .filter(t => t.estado === "Activo")
        .forEach(trabajador => {
            const opcion = document.createElement("option");

            opcion.value = trabajador.id_trabajador;
            opcion.textContent =
                `${trabajador.nombres} ${trabajador.apellidos} — ${trabajador.cargo || "Sin cargo"}`;

            selectorTrabajador.appendChild(opcion);
        });
}

// CARGAR ASIGNACIONES
async function cargarAsignaciones() {
    try {
        asignaciones = await solicitar("/api/asignaciones");

        mostrarAsignaciones();
        actualizarResumen();

    } catch (error) {
        console.error(error);

        tabla.innerHTML =
            '<tr><td colspan="8">Error al cargar asignaciones</td></tr>';

        [
            "totalAsignaciones",
            "totalTrabajadoresAsignados",
            "totalActividadesAsignadas"
        ].forEach(id => {
            document.getElementById(id).textContent = "Error";
        });
    }
}

// ACTUALIZAR INDICADORES
function actualizarResumen() {
    document.getElementById("totalAsignaciones").textContent =
        asignaciones.length;

    const trabajadoresDistintos = new Set(
        asignaciones.map(a => a.id_trabajador)
    );

    const actividadesDistintas = new Set(
        asignaciones.map(a => a.id_actividad)
    );

    document.getElementById("totalTrabajadoresAsignados").textContent =
        trabajadoresDistintos.size;

    document.getElementById("totalActividadesAsignadas").textContent =
        actividadesDistintas.size;
}

// MOSTRAR ASIGNACIONES
function mostrarAsignaciones() {
    const texto = buscador.value.trim().toLowerCase();
    const estado = filtroEstado.value;

    const filtradas = asignaciones.filter(asignacion => {
        const coincideTexto = [
            asignacion.actividad,
            asignacion.cultivo,
            asignacion.parcela,
            asignacion.nombres,
            asignacion.apellidos,
            asignacion.cargo
        ].some(valor =>
            String(valor || "").toLowerCase().includes(texto)
        );

        const coincideEstado =
            !estado || asignacion.estado_actividad === estado;

        return coincideTexto && coincideEstado;
    });

    tabla.innerHTML = "";

    if (!filtradas.length) {
        tabla.innerHTML =
            '<tr><td colspan="8">No se encontraron asignaciones</td></tr>';
        return;
    }

    filtradas.forEach(asignacion => {
        const fila = document.createElement("tr");

        const valores = [
            asignacion.id_asignacion,
            asignacion.actividad,
            asignacion.cultivo,
            asignacion.parcela,
            `${asignacion.nombres} ${asignacion.apellidos}`,
            asignacion.cargo || "Sin cargo"
        ];

        valores.forEach((valor, indice) => {
            const celda = document.createElement("td");
            celda.textContent = valor ?? "";

            if (
                indice === 4 &&
                asignacion.estado_trabajador !== "Activo"
            ) {
                const aviso = document.createElement("div");
                aviso.className = "trabajador-inactivo";
                aviso.textContent = "Trabajador inactivo";
                celda.appendChild(aviso);
            }

            fila.appendChild(celda);
        });

        // ESTADO DE LA ACTIVIDAD
        const celdaEstado = document.createElement("td");
        const etiqueta = document.createElement("span");

        etiqueta.textContent = asignacion.estado_actividad;
        etiqueta.classList.add("etiqueta-actividad");

        if (asignacion.estado_actividad === "Pendiente") {
            etiqueta.classList.add("actividad-pendiente");
        } else if (asignacion.estado_actividad === "En proceso") {
            etiqueta.classList.add("actividad-proceso");
        } else if (asignacion.estado_actividad === "Completada") {
            etiqueta.classList.add("actividad-completada");
        }

        celdaEstado.appendChild(etiqueta);
        fila.appendChild(celdaEstado);

        // ACCIONES
        const acciones = document.createElement("td");
        acciones.classList.add("acciones-asignacion");

        const editar = document.createElement("button");
        editar.textContent = "Editar";

        editar.addEventListener("click", () => {
            editarAsignacion(asignacion);
        });

        const eliminar = document.createElement("button");
        eliminar.textContent = "Eliminar";
        eliminar.classList.add("btn-eliminar");

        eliminar.addEventListener("click", () => {
            eliminarAsignacion(asignacion.id_asignacion);
        });

        acciones.append(editar, eliminar);
        fila.appendChild(acciones);
        tabla.appendChild(fila);
    });
}

// NUEVA ASIGNACIÓN
document.getElementById("btnNueva").addEventListener(
    "click",
    async () => {
        try {
            await cargarOpciones();

            formulario.reset();

            document.getElementById("asignacionId").value = "";
            document.getElementById("tituloFormulario").textContent =
                "Registrar asignación";

            panel.hidden = false;
            panel.scrollIntoView({ behavior: "smooth" });

        } catch (error) {
            alert("No se pudieron cargar las opciones: " + error.message);
        }
    }
);

// CANCELAR
document.getElementById("btnCancelar").addEventListener(
    "click",
    () => {
        formulario.reset();
        panel.hidden = true;
    }
);

// BUSCAR Y FILTRAR
buscador.addEventListener("input", mostrarAsignaciones);
filtroEstado.addEventListener("change", mostrarAsignaciones);

// EDITAR ASIGNACIÓN
async function editarAsignacion(asignacion) {
    try {
        await cargarOpciones();

        document.getElementById("asignacionId").value =
            asignacion.id_asignacion;

        selectorActividad.value = asignacion.id_actividad;

        // Conservar una asignación histórica aunque
        // el trabajador esté actualmente inactivo.
        const existe = Array.from(selectorTrabajador.options)
            .some(op => op.value === String(asignacion.id_trabajador));

        if (!existe) {
            const opcion = document.createElement("option");
            opcion.value = asignacion.id_trabajador;
            opcion.textContent =
                `${asignacion.nombres} ${asignacion.apellidos} (Inactivo)`;

            selectorTrabajador.appendChild(opcion);
        }

        selectorTrabajador.value = asignacion.id_trabajador;

        document.getElementById("tituloFormulario").textContent =
            "Editar asignación";

        panel.hidden = false;
        panel.scrollIntoView({ behavior: "smooth" });

    } catch (error) {
        alert(error.message);
    }
}

// ELIMINAR ASIGNACIÓN
async function eliminarAsignacion(id) {
    if (!confirm("¿Deseas eliminar esta asignación?")) {
        return;
    }

    try {
        await solicitar(`/api/asignaciones/${id}`, {
            method: "DELETE"
        });

        await cargarAsignaciones();
        alert("Asignación eliminada correctamente");

    } catch (error) {
        alert(error.message);
    }
}

// GUARDAR O ACTUALIZAR
formulario.addEventListener("submit", async evento => {
    evento.preventDefault();

    const id = document.getElementById("asignacionId").value;

    const datos = {
        id_actividad: Number(selectorActividad.value),
        id_trabajador: Number(selectorTrabajador.value)
    };

    if (
        !Number.isInteger(datos.id_actividad) ||
        datos.id_actividad <= 0 ||
        !Number.isInteger(datos.id_trabajador) ||
        datos.id_trabajador <= 0
    ) {
        alert("Selecciona una actividad y un trabajador");
        return;
    }

    const duplicada = asignaciones.some(a =>
        a.id_actividad === datos.id_actividad &&
        a.id_trabajador === datos.id_trabajador &&
        String(a.id_asignacion) !== String(id)
    );

    if (duplicada) {
        alert("Este trabajador ya está asignado a esa actividad");
        return;
    }

    try {
        await solicitar(
            id ? `/api/asignaciones/${id}` : "/api/asignaciones",
            {
                method: id ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(datos)
            }
        );

        formulario.reset();
        panel.hidden = true;

        await cargarAsignaciones();

        alert(
            id
                ? "Asignación actualizada correctamente"
                : "Asignación registrada correctamente"
        );

    } catch (error) {
        alert(error.message);
    }
});

// INICIALIZAR
document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    cargarAsignaciones();
});
