
const tabla = document.getElementById("tablaCosechas");
const formulario = document.getElementById("formCosecha");
const panel = document.getElementById("panelFormulario");

const buscador = document.getElementById("buscarCosecha");
const filtroUnidad = document.getElementById("filtroUnidad");

const selectorCultivo = document.getElementById("cultivo");

let cosechas = [];

// SOLICITUDES A LA API
async function solicitar(url, opciones = {}) {
    const respuesta = await fetch(url, opciones);

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(
            datos.error || "Error al comunicarse con el servidor"
        );
    }

    return datos;
}

// CARGAR CULTIVOS
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

// CARGAR COSECHAS
async function cargarCosechas() {
    try {
        cosechas = await solicitar("/api/cosechas");

        mostrarCosechas();
        actualizarResumen();
    } catch (error) {
        console.error(error);

        tabla.innerHTML =
            '<tr><td colspan="7">Error al cargar cosechas</td></tr>';

        ["totalCosechas", "totalCultivosCosechados", "ultimaCosecha"]
            .forEach(id => {
                document.getElementById(id).textContent = "Error";
            });
    }
}

// MOSTRAR RESUMEN
function actualizarResumen() {
    document.getElementById("totalCosechas").textContent =
        cosechas.length;

    const cultivosDistintos = new Set(
        cosechas.map(c => c.id_cultivo)
    );

    document.getElementById("totalCultivosCosechados").textContent =
        cultivosDistintos.size;

    const fechas = cosechas
        .map(c => c.fecha_cosecha)
        .filter(Boolean)
        .sort()
        .reverse();

    document.getElementById("ultimaCosecha").textContent =
        fechas.length ? fechas[0] : "--";
}

// MOSTRAR TABLA
function mostrarCosechas() {
    const texto = buscador.value.trim().toLowerCase();
    const unidad = filtroUnidad.value;

    const filtradas = cosechas.filter(cosecha => {
        const coincideTexto = [
            cosecha.cultivo,
            cosecha.parcela,
            cosecha.fecha_cosecha
        ].some(valor =>
            String(valor || "").toLowerCase().includes(texto)
        );

        const coincideUnidad =
            !unidad || cosecha.unidad_medida === unidad;

        return coincideTexto && coincideUnidad;
    });

    tabla.innerHTML = "";

    if (!filtradas.length) {
        tabla.innerHTML =
            '<tr><td colspan="7">No se encontraron cosechas</td></tr>';
        return;
    }

    filtradas.forEach(cosecha => {
        const fila = document.createElement("tr");

        const valores = [
            cosecha.id_cosecha,
            cosecha.cultivo,
            cosecha.parcela,
            cosecha.fecha_cosecha,
            cosecha.cantidad,
            cosecha.unidad_medida
        ];

        valores.forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor ?? "";
            fila.appendChild(celda);
        });

        // BOTONES DE ACCIÓN
        const acciones = document.createElement("td");
        acciones.classList.add("acciones-celda");

        const editar = document.createElement("button");
        editar.textContent = "Editar";

        editar.addEventListener("click", () => {
            editarCosecha(cosecha);
        });

        const eliminar = document.createElement("button");
        eliminar.textContent = "Eliminar";
        eliminar.classList.add("btn-eliminar");

        eliminar.addEventListener("click", () => {
            eliminarCosecha(cosecha.id_cosecha);
        });

        acciones.append(editar, eliminar);
        fila.appendChild(acciones);

        tabla.appendChild(fila);
    });
}

// BOTÓN NUEVA COSECHA
document.getElementById("btnNueva")
    .addEventListener("click", () => {
        formulario.reset();

        document.getElementById("cosechaId").value = "";
        document.getElementById("tituloFormulario").textContent =
            "Registrar cosecha";

        panel.hidden = false;

        panel.scrollIntoView({
            behavior: "smooth"
        });
    });

// CANCELAR
document.getElementById("btnCancelar")
    .addEventListener("click", () => {
        formulario.reset();
        panel.hidden = true;
    });

// BUSCAR Y FILTRAR
buscador.addEventListener("input", mostrarCosechas);
filtroUnidad.addEventListener("change", mostrarCosechas);

// EDITAR

function editarCosecha(cosecha) {

    document.getElementById("cosechaId").value =
        cosecha.id_cosecha;

    selectorCultivo.value = cosecha.id_cultivo;

    document.getElementById("fechaCosecha").value =
        cosecha.fecha_cosecha;

    document.getElementById("cantidad").value =
        cosecha.cantidad;

    document.getElementById("unidadMedida").value =
        cosecha.unidad_medida;

    // Actualizar el ejemplo según la unidad
    actualizarEjemploCantidad();

    document.getElementById("observaciones").value =
        cosecha.observaciones || "";

    document.getElementById("tituloFormulario").textContent =
        "Editar cosecha";

    panel.hidden = false;

    panel.scrollIntoView({
        behavior: "smooth"
    });
}


// ELIMINAR
async function eliminarCosecha(id) {
    if (!confirm("¿Deseas eliminar esta cosecha?")) {
        return;
    }

    try {
        await solicitar(`/api/cosechas/${id}`, {
            method: "DELETE"
        });

        await cargarCosechas();

        alert("Cosecha eliminada correctamente");
    } catch (error) {
        alert(error.message);
    }
}

// GUARDAR / ACTUALIZAR
formulario.addEventListener("submit", async evento => {
    evento.preventDefault();

    const id = document.getElementById("cosechaId").value;

    const datos = {
        id_cultivo: Number(selectorCultivo.value),

        fecha_cosecha:
            document.getElementById("fechaCosecha").value,

        cantidad:
            Number(document.getElementById("cantidad").value),

        unidad_medida:
            document.getElementById("unidadMedida").value,

        observaciones:
            document.getElementById("observaciones").value.trim()
    };

    if (
        !Number.isInteger(datos.id_cultivo) ||
        datos.id_cultivo <= 0 ||
        !datos.fecha_cosecha ||
        !Number.isFinite(datos.cantidad) ||
        datos.cantidad <= 0 ||
        !datos.unidad_medida
    ) {
        alert("Completa correctamente los campos obligatorios");
        return;
    }

    try {
        await solicitar(
            id ? `/api/cosechas/${id}` : "/api/cosechas",
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

        await cargarCosechas();

        alert(
            id
                ? "Cosecha actualizada correctamente"
                : "Cosecha registrada correctamente"
        );
    } catch (error) {
        alert(error.message);
    }
});

// INICIALIZAR
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

    await cargarCosechas();
});


/* EJEMPLOS DINÁMICOS SEGÚN UNIDAD DE MEDIDA */

const unidadMedidaInput = document.getElementById("unidadMedida");
const cantidadInput = document.getElementById("cantidad");

function actualizarEjemploCantidad() {
    const unidad = unidadMedidaInput.value;

    const ejemplos = {
        "kg": {
            ejemplo: "Ej. 150.50 kg",
            paso: "0.01"
        },
        "toneladas": {
            ejemplo: "Ej. 2.50 toneladas",
            paso: "0.01"
        },
        "quintales": {
            ejemplo: "Ej. 25 quintales",
            paso: "0.01"
        },
        "unidades": {
            ejemplo: "Ej. 300 unidades",
            paso: "1"
        }
    };

    if (ejemplos[unidad]) {
        cantidadInput.placeholder = ejemplos[unidad].ejemplo;
        cantidadInput.step = ejemplos[unidad].paso;
    } else {
        cantidadInput.placeholder = "Seleccione primero una unidad";
        cantidadInput.step = "0.01";
    }
}

unidadMedidaInput.addEventListener(
    "change",
    actualizarEjemploCantidad
);

actualizarEjemploCantidad();
