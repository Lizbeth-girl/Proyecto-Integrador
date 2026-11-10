
const tabla = document.getElementById("tablaInsumos");
const formulario = document.getElementById("formInsumo");
const panel = document.getElementById("panelFormulario");

const buscador = document.getElementById("buscarInsumo");
const filtroStock = document.getElementById("filtroStock");

const unidad = document.getElementById("unidadMedida");
const stockActual = document.getElementById("stockActual");
const stockMinimo = document.getElementById("stockMinimo");

let insumos = [];

// COMUNICACIÓN CON LA API
async function solicitar(url, opciones = {}) {
    const respuesta = await fetch(url, opciones);
    const tipo = respuesta.headers.get("content-type") || "";

    if (!tipo.includes("application/json")) {
        throw new Error("El servidor no devolvió una respuesta JSON");
    }

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.error || "Error en la solicitud");
    }

    return datos;
}

// DETERMINAR ESTADO DEL INVENTARIO
function obtenerEstado(insumo) {
    const actual = Number(insumo.stock_actual);
    const minimo = Number(insumo.stock_minimo);

    if (actual <= 0) {
        return "Agotado";
    }

    if (actual <= minimo) {
        return "Stock bajo";
    }

    return "Disponible";
}

// ACTUALIZAR EJEMPLOS SEGÚN LA UNIDAD
function actualizarEjemplos() {
    const ejemplos = {
        kg: ["Ej. 150.50 kg", "Ej. 20 kg", "0.01"],
        litros: ["Ej. 25.50 litros", "Ej. 5 litros", "0.01"],
        toneladas: ["Ej. 2.50 toneladas", "Ej. 1 tonelada", "0.01"],
        quintales: ["Ej. 25 quintales", "Ej. 5 quintales", "0.01"],
        unidades: ["Ej. 300 unidades", "Ej. 20 unidades", "1"]
    };

    const configuracion = ejemplos[unidad.value];

    if (configuracion) {
        stockActual.placeholder = configuracion[0];
        stockMinimo.placeholder = configuracion[1];
        stockActual.step = configuracion[2];
        stockMinimo.step = configuracion[2];
    } else {
        stockActual.placeholder = "Seleccione una unidad de medida";
        stockMinimo.placeholder = "Cantidad mínima deseada";
        stockActual.step = "0.01";
        stockMinimo.step = "0.01";
    }
}

unidad.addEventListener("change", actualizarEjemplos);

// CARGAR INSUMOS
async function cargarInsumos() {
    try {
        insumos = await solicitar("/api/insumos");

        mostrarInsumos();
        actualizarResumen();

    } catch (error) {
        console.error(error);

        tabla.innerHTML =
            '<tr><td colspan="7">Error al cargar insumos</td></tr>';

        [
            "totalInsumos",
            "totalStockBajo",
            "totalAgotados"
        ].forEach(id => {
            document.getElementById(id).textContent = "Error";
        });
    }
}

// ACTUALIZAR INDICADORES
function actualizarResumen() {
    document.getElementById("totalInsumos").textContent =
        insumos.length;

    document.getElementById("totalStockBajo").textContent =
        insumos.filter(i => obtenerEstado(i) === "Stock bajo").length;

    document.getElementById("totalAgotados").textContent =
        insumos.filter(i => obtenerEstado(i) === "Agotado").length;
}

// MOSTRAR TABLA
function mostrarInsumos() {
    const texto = buscador.value.trim().toLowerCase();
    const estadoSeleccionado = filtroStock.value;

    const filtrados = insumos.filter(insumo => {
        const coincideTexto = [
            insumo.nombre,
            insumo.categoria,
            insumo.unidad_medida
        ].some(valor =>
            String(valor || "").toLowerCase().includes(texto)
        );

        const coincideEstado =
            !estadoSeleccionado ||
            obtenerEstado(insumo) === estadoSeleccionado;

        return coincideTexto && coincideEstado;
    });

    tabla.innerHTML = "";

    if (!filtrados.length) {
        tabla.innerHTML =
            '<tr><td colspan="7">No se encontraron insumos</td></tr>';
        return;
    }

    filtrados.forEach(insumo => {
        const fila = document.createElement("tr");

        const valores = [
            insumo.id_insumo,
            insumo.nombre,
            insumo.categoria,
            `${insumo.stock_actual} ${insumo.unidad_medida}`,
            `${insumo.stock_minimo} ${insumo.unidad_medida}`
        ];

        valores.forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor ?? "";
            fila.appendChild(celda);
        });

        // ETIQUETA DE ESTADO
        const celdaEstado = document.createElement("td");
        const etiqueta = document.createElement("span");
        const estado = obtenerEstado(insumo);

        etiqueta.textContent = estado;
        etiqueta.classList.add("estado-stock");

        if (estado === "Disponible") {
            etiqueta.classList.add("estado-disponible");
        } else if (estado === "Stock bajo") {
            etiqueta.classList.add("estado-bajo");
        } else {
            etiqueta.classList.add("estado-agotado");
        }

        celdaEstado.appendChild(etiqueta);
        fila.appendChild(celdaEstado);

        // BOTONES EDITAR Y ELIMINAR
        const acciones = document.createElement("td");
        acciones.classList.add("acciones-insumo");

        const editar = document.createElement("button");
        editar.textContent = "Editar";

        editar.addEventListener("click", () => {
            editarInsumo(insumo);
        });

        const eliminar = document.createElement("button");
        eliminar.textContent = "Eliminar";
        eliminar.classList.add("btn-eliminar");

        eliminar.addEventListener("click", () => {
            eliminarInsumo(insumo.id_insumo);
        });

        acciones.append(editar, eliminar);
        fila.appendChild(acciones);
        tabla.appendChild(fila);
    });
}

// NUEVO INSUMO
document.getElementById("btnNuevo").addEventListener("click", () => {
    formulario.reset();

    document.getElementById("insumoId").value = "";
    document.getElementById("tituloFormulario").textContent =
        "Registrar insumo";

    stockActual.value = "0";
    stockMinimo.value = "0";

    actualizarEjemplos();

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth" });
});

// CANCELAR
document.getElementById("btnCancelar").addEventListener("click", () => {
    formulario.reset();
    panel.hidden = true;
});

// FILTROS
buscador.addEventListener("input", mostrarInsumos);
filtroStock.addEventListener("change", mostrarInsumos);

// EDITAR INSUMO
function editarInsumo(insumo) {
    document.getElementById("insumoId").value =
        insumo.id_insumo;

    document.getElementById("nombre").value =
        insumo.nombre;

    document.getElementById("categoria").value =
        insumo.categoria;

    unidad.value = insumo.unidad_medida;

    // Actualizar ejemplos de los campos numéricos
    actualizarEjemplos();

    stockActual.value = insumo.stock_actual;
    stockMinimo.value = insumo.stock_minimo;

    document.getElementById("tituloFormulario").textContent =
        "Editar insumo";

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth" });
}

// ELIMINAR INSUMO
async function eliminarInsumo(id) {
    if (!confirm("¿Deseas eliminar este insumo?")) {
        return;
    }

    try {
        await solicitar(`/api/insumos/${id}`, {
            method: "DELETE"
        });

        await cargarInsumos();

        alert("Insumo eliminado correctamente");
    } catch (error) {
        alert(error.message);
    }
}

// GUARDAR O ACTUALIZAR INSUMO
formulario.addEventListener("submit", async evento => {
    evento.preventDefault();

    const id = document.getElementById("insumoId").value;

    const datos = {
        nombre: document.getElementById("nombre").value.trim(),
        categoria: document.getElementById("categoria").value,
        unidad_medida: unidad.value,
        stock_actual: Number(stockActual.value),
        stock_minimo: Number(stockMinimo.value)
    };

    if (
        !datos.nombre ||
        !datos.categoria ||
        !datos.unidad_medida ||
        stockActual.value === "" ||
        stockMinimo.value === "" ||
        !Number.isFinite(datos.stock_actual) ||
        !Number.isFinite(datos.stock_minimo) ||
        datos.stock_actual < 0 ||
        datos.stock_minimo < 0
    ) {
        alert("Completa correctamente todos los campos");
        return;
    }

    if (
        datos.unidad_medida === "unidades" &&
        (
            !Number.isInteger(datos.stock_actual) ||
            !Number.isInteger(datos.stock_minimo)
        )
    ) {
        alert("Ingresa cantidades enteras para unidades");
        return;
    }

    try {
        await solicitar(
            id ? `/api/insumos/${id}` : "/api/insumos",
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

        await cargarInsumos();

        alert(
            id
                ? "Insumo actualizado correctamente"
                : "Insumo registrado correctamente"
        );
    } catch (error) {
        alert(error.message);
    }
});

// INICIAR
document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    actualizarEjemplos();
    cargarInsumos();
});
