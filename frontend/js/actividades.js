
const tabla = document.getElementById("tablaActividades");
const formulario = document.getElementById("formActividad");
const panel = document.getElementById("panelFormulario");

const buscar = document.getElementById("buscarActividad");
const filtroEstado = document.getElementById("filtroEstado");

const selectorCultivo = document.getElementById("cultivo");
const selectorEstado = document.getElementById("estado");
const fechaRealizada = document.getElementById("fechaRealizada");
const campoFecha = document.getElementById("campoFechaRealizada");

let actividades = [];

// SOLICITUDES A LA API
async function solicitar(url, opciones = {}) {
    const respuesta = await fetch(url, opciones);
    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.error || "Error en la solicitud");
    }

    return datos;
}

// CARGAR CULTIVOS DISPONIBLES
async function cargarCultivos() {
    const cultivos = await solicitar("/api/cultivos");

    selectorCultivo.innerHTML =
        '<option value="">Seleccione un cultivo</option>';

    cultivos.forEach(cultivo => {
        const opcion = document.createElement("option");

        opcion.value = cultivo.id_cultivo;
        opcion.textContent =
            `${cultivo.nombre} — ${cultivo.parcela}`;

        selectorCultivo.appendChild(opcion);
    });
}

// CARGAR ACTIVIDADES
async function cargarActividades() {
    try {
        actividades = await solicitar("/api/actividades");

        mostrarActividades();
        actualizarResumen();
    } catch (error) {
        console.error(error);

        tabla.innerHTML =
            '<tr><td colspan="8">Error al cargar actividades</td></tr>';
    }
}

// INDICADORES
function actualizarResumen() {
    document.getElementById("totalActividades").textContent =
        actividades.length;

    document.getElementById("totalPendientes").textContent =
        actividades.filter(a => a.estado === "Pendiente").length;

    document.getElementById("totalProceso").textContent =
        actividades.filter(a => a.estado === "En proceso").length;

    document.getElementById("totalCompletadas").textContent =
        actividades.filter(a => a.estado === "Completada").length;
}

// MOSTRAR DATOS EN LA TABLA
function mostrarActividades() {
    const texto = buscar.value.trim().toLowerCase();
    const estado = filtroEstado.value;

    const filtradas = actividades.filter(actividad => {
        const coincideTexto = [
            actividad.nombre,
            actividad.cultivo,
            actividad.parcela,
            actividad.descripcion
        ].some(valor =>
            String(valor || "").toLowerCase().includes(texto)
        );

        const coincideEstado =
            !estado || actividad.estado === estado;

        return coincideTexto && coincideEstado;
    });

    tabla.innerHTML = "";

    if (!filtradas.length) {
        tabla.innerHTML =
            '<tr><td colspan="8">No se encontraron actividades</td></tr>';
        return;
    }

    filtradas.forEach(actividad => {
        const fila = document.createElement("tr");

        const valores = [
            actividad.id_actividad,
            actividad.nombre,
            actividad.cultivo,
            actividad.parcela,
            actividad.fecha_programada,
            actividad.fecha_realizada || "—"
        ];

        valores.forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor ?? "";
            fila.appendChild(celda);
        });

        // ESTADO CON COLOR
        const celdaEstado = document.createElement("td");
        const etiqueta = document.createElement("span");

        etiqueta.textContent = actividad.estado;
        etiqueta.classList.add("estado-etiqueta");

        if (actividad.estado === "Pendiente") {
            etiqueta.classList.add("estado-pendiente");
        } else if (actividad.estado === "En proceso") {
            etiqueta.classList.add("estado-proceso");
        } else if (actividad.estado === "Completada") {
            etiqueta.classList.add("estado-completada");
        }

        celdaEstado.appendChild(etiqueta);
        fila.appendChild(celdaEstado);

        // BOTONES
        const acciones = document.createElement("td");
        acciones.classList.add("acciones-celda");

        const btnEditar = document.createElement("button");
        btnEditar.textContent = "Editar";

        btnEditar.addEventListener("click", () => {
            editarActividad(actividad);
        });

        const btnEliminar = document.createElement("button");
        btnEliminar.textContent = "Eliminar";
        btnEliminar.classList.add("btn-eliminar");

        btnEliminar.addEventListener("click", () => {
            eliminarActividad(actividad.id_actividad);
        });

        acciones.append(btnEditar, btnEliminar);
        fila.appendChild(acciones);
        tabla.appendChild(fila);
    });
}

// MOSTRAR U OCULTAR FECHA REALIZADA
function actualizarCampoFecha() {
    const completada = selectorEstado.value === "Completada";

    campoFecha.hidden = !completada;
    fechaRealizada.required = completada;

    if (!completada) {
        fechaRealizada.value = "";
    }
}

selectorEstado.addEventListener("change", actualizarCampoFecha);

// ABRIR FORMULARIO NUEVO
document.getElementById("btnNueva").addEventListener("click", () => {
    formulario.reset();
    document.getElementById("actividadId").value = "";
    document.getElementById("tituloFormulario").textContent =
        "Registrar actividad";

    selectorEstado.value = "Pendiente";
    actualizarCampoFecha();

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth" });
});

// CANCELAR
document.getElementById("btnCancelar").addEventListener("click", () => {
    formulario.reset();
    panel.hidden = true;
});

// BUSCADOR Y FILTROS
buscar.addEventListener("input", mostrarActividades);
filtroEstado.addEventListener("change", mostrarActividades);

// EDITAR ACTIVIDAD
function editarActividad(actividad) {
    document.getElementById("actividadId").value =
        actividad.id_actividad;

    selectorCultivo.value = actividad.id_cultivo;

    document.getElementById("nombre").value =
        actividad.nombre;

    document.getElementById("descripcion").value =
        actividad.descripcion || "";

    document.getElementById("fechaProgramada").value =
        actividad.fecha_programada;

    selectorEstado.value = actividad.estado;
    actualizarCampoFecha();

    fechaRealizada.value =
        actividad.fecha_realizada || "";

    document.getElementById("tituloFormulario").textContent =
        "Editar actividad";

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth" });
}

// ELIMINAR ACTIVIDAD
async function eliminarActividad(id) {
    if (!confirm("¿Deseas eliminar esta actividad?")) return;

    try {
        await solicitar(`/api/actividades/${id}`, {
            method: "DELETE"
        });

        await cargarActividades();
        alert("Actividad eliminada correctamente");
    } catch (error) {
        alert(error.message);
    }
}

// GUARDAR O ACTUALIZAR
formulario.addEventListener("submit", async evento => {
    evento.preventDefault();

    const id = document.getElementById("actividadId").value;

    const datos = {
        id_cultivo: Number(selectorCultivo.value),
        nombre: document.getElementById("nombre").value.trim(),
        descripcion:
            document.getElementById("descripcion").value.trim(),
        fecha_programada:
            document.getElementById("fechaProgramada").value,
        fecha_realizada:
            selectorEstado.value === "Completada"
                ? fechaRealizada.value
                : null,
        estado: selectorEstado.value
    };

    try {
        await solicitar(
            id ? `/api/actividades/${id}` : "/api/actividades",
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

        await cargarActividades();

        alert(
            id
                ? "Actividad actualizada correctamente"
                : "Actividad registrada correctamente"
        );
    } catch (error) {
        alert(error.message);
    }
});

// INICIAR MÓDULO
document.addEventListener("DOMContentLoaded", async () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    try {
        await cargarCultivos();
    } catch (error) {
        console.error(error);
        selectorCultivo.innerHTML =
            '<option value="">Error al cargar cultivos</option>';
    }

    await cargarActividades();
});
