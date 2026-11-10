
const tabla = document.getElementById("tablaTrabajadores");
const formulario = document.getElementById("formTrabajador");
const panel = document.getElementById("panelFormulario");

const buscador = document.getElementById("buscarTrabajador");
const filtroEstado = document.getElementById("filtroEstado");

let trabajadores = [];

// COMUNICACIÓN CON EL SERVIDOR
async function solicitar(url, opciones = {}) {
    const respuesta = await fetch(url, opciones);
    const tipo = respuesta.headers.get("content-type") || "";

    if (!tipo.includes("application/json")) {
        throw new Error("El servidor no devolvió información JSON");
    }

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.error || "Error en la solicitud");
    }

    return datos;
}

// CONSULTAR TRABAJADORES
async function cargarTrabajadores() {
    try {
        trabajadores = await solicitar("/api/trabajadores");

        mostrarTrabajadores();
        actualizarResumen();

    } catch (error) {
        console.error(error);

        tabla.innerHTML =
            '<tr><td colspan="7">Error al cargar trabajadores</td></tr>';

        [
            "totalTrabajadores",
            "totalActivos",
            "totalInactivos"
        ].forEach(id => {
            document.getElementById(id).textContent = "Error";
        });
    }
}

// ACTUALIZAR INDICADORES
function actualizarResumen() {
    document.getElementById("totalTrabajadores").textContent =
        trabajadores.length;

    document.getElementById("totalActivos").textContent =
        trabajadores.filter(t => t.estado === "Activo").length;

    document.getElementById("totalInactivos").textContent =
        trabajadores.filter(t => t.estado === "Inactivo").length;
}

// MOSTRAR TABLA
function mostrarTrabajadores() {
    const texto = buscador.value.trim().toLowerCase();
    const estado = filtroEstado.value;

    const filtrados = trabajadores.filter(trabajador => {
        const coincideTexto = [
            trabajador.nombres,
            trabajador.apellidos,
            trabajador.telefono,
            trabajador.cargo
        ].some(valor =>
            String(valor || "").toLowerCase().includes(texto)
        );

        const coincideEstado =
            !estado || trabajador.estado === estado;

        return coincideTexto && coincideEstado;
    });

    tabla.innerHTML = "";

    if (filtrados.length === 0) {
        tabla.innerHTML =
            '<tr><td colspan="7">No se encontraron trabajadores</td></tr>';
        return;
    }

    filtrados.forEach(trabajador => {
        const fila = document.createElement("tr");

        const valores = [
            trabajador.id_trabajador,
            trabajador.nombres,
            trabajador.apellidos,
            trabajador.telefono || "—",
            trabajador.cargo || "Sin asignar"
        ];

        valores.forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor ?? "";
            fila.appendChild(celda);
        });

        // ESTADO
        const celdaEstado = document.createElement("td");
        const etiqueta = document.createElement("span");

        etiqueta.textContent = trabajador.estado || "Activo";
        etiqueta.classList.add("etiqueta-estado");

        if (trabajador.estado === "Inactivo") {
            etiqueta.classList.add("estado-inactivo");
        } else {
            etiqueta.classList.add("estado-activo");
        }

        celdaEstado.appendChild(etiqueta);
        fila.appendChild(celdaEstado);

        // ACCIONES
        const acciones = document.createElement("td");
        acciones.classList.add("acciones-trabajador");

        const editar = document.createElement("button");
        editar.textContent = "Editar";

        editar.addEventListener("click", () => {
            editarTrabajador(trabajador);
        });

        const eliminar = document.createElement("button");
        eliminar.textContent = "Eliminar";
        eliminar.classList.add("btn-eliminar");

        eliminar.addEventListener("click", () => {
            eliminarTrabajador(trabajador.id_trabajador);
        });

        acciones.append(editar, eliminar);
        fila.appendChild(acciones);
        tabla.appendChild(fila);
    });
}

// NUEVO TRABAJADOR
document.getElementById("btnNuevo").addEventListener("click", () => {
    formulario.reset();

    document.getElementById("trabajadorId").value = "";
    document.getElementById("tituloFormulario").textContent =
        "Registrar trabajador";

    document.getElementById("estado").value = "Activo";

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth" });
});

// CANCELAR
document.getElementById("btnCancelar").addEventListener("click", () => {
    formulario.reset();
    panel.hidden = true;
});

// BUSCAR Y FILTRAR
buscador.addEventListener("input", mostrarTrabajadores);
filtroEstado.addEventListener("change", mostrarTrabajadores);

// EDITAR TRABAJADOR
function editarTrabajador(trabajador) {
    document.getElementById("trabajadorId").value =
        trabajador.id_trabajador;

    document.getElementById("nombres").value =
        trabajador.nombres;

    document.getElementById("apellidos").value =
        trabajador.apellidos;

    document.getElementById("telefono").value =
        trabajador.telefono || "";

    const selectorCargo = document.getElementById("cargo");
    const cargo = trabajador.cargo || "";

    // Permitir visualizar cargos previamente registrados
    // aunque no estén en la lista predefinida.
    const existeCargo = Array.from(selectorCargo.options)
        .some(opcion => opcion.value === cargo);

    const opcionTemporal = selectorCargo.querySelector(
        'option[data-temporal="true"]'
    );

    if (opcionTemporal) opcionTemporal.remove();

    if (cargo && !existeCargo) {
        const opcion = document.createElement("option");
        opcion.value = cargo;
        opcion.textContent = cargo;
        opcion.dataset.temporal = "true";
        selectorCargo.appendChild(opcion);
    }

    selectorCargo.value = cargo;

    document.getElementById("estado").value =
        trabajador.estado || "Activo";

    document.getElementById("tituloFormulario").textContent =
        "Editar trabajador";

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth" });
}

// ELIMINAR TRABAJADOR
async function eliminarTrabajador(id) {
    if (!confirm("¿Deseas eliminar este trabajador?")) {
        return;
    }

    try {
        await solicitar(`/api/trabajadores/${id}`, {
            method: "DELETE"
        });

        await cargarTrabajadores();
        alert("Trabajador eliminado correctamente");

    } catch (error) {
        alert(error.message);
    }
}

// GUARDAR O ACTUALIZAR
formulario.addEventListener("submit", async evento => {
    evento.preventDefault();

    const id = document.getElementById("trabajadorId").value;

    const datos = {
        nombres: document.getElementById("nombres").value.trim(),
        apellidos: document.getElementById("apellidos").value.trim(),
        telefono: document.getElementById("telefono").value.trim(),
        cargo: document.getElementById("cargo").value,
        estado: document.getElementById("estado").value
    };

    if (!datos.nombres || !datos.apellidos || !datos.estado) {
        alert("Completa los campos obligatorios");
        return;
    }

    try {
        await solicitar(
            id ? `/api/trabajadores/${id}` : "/api/trabajadores",
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

        await cargarTrabajadores();

        alert(
            id
                ? "Trabajador actualizado correctamente"
                : "Trabajador registrado correctamente"
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

    cargarTrabajadores();
});
