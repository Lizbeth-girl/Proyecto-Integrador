
const tabla = document.getElementById("tablaCultivos");
const buscador = document.getElementById("buscarCultivo");
const formulario = document.getElementById("formCultivo");
const panel = document.getElementById("panelFormulario");
const selectorParcela = document.getElementById("parcela");

let cultivos = [];

async function solicitar(url, opciones = {}) {
    const respuesta = await fetch(url, opciones);
    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.error || "Error en la solicitud");
    }

    return datos;
}

async function cargarParcelas() {
    const parcelas = await solicitar("/api/parcelas");

    selectorParcela.innerHTML =
        '<option value="">Seleccione una parcela</option>';

    parcelas.forEach(parcela => {
        const opcion = document.createElement("option");
        opcion.value = parcela.id_parcela;
        opcion.textContent = parcela.nombre;
        selectorParcela.appendChild(opcion);
    });
}

async function cargarCultivos() {
    try {
        cultivos = await solicitar("/api/cultivos");
        mostrarCultivos();
    } catch (error) {
        tabla.innerHTML =
            '<tr><td colspan="7">Error al cargar cultivos</td></tr>';
        console.error(error);
    }
}

function fecha(valor) {
    return valor ? String(valor).slice(0, 10) : "";
}

function mostrarCultivos() {
    const texto = buscador.value.toLowerCase();

    const filtrados = cultivos.filter(c =>
        `${c.nombre} ${c.parcela} ${c.estado}`
            .toLowerCase().includes(texto)
    );

    tabla.innerHTML = "";

    if (!filtrados.length) {
        tabla.innerHTML =
            '<tr><td colspan="7">No hay cultivos registrados</td></tr>';
        return;
    }

    filtrados.forEach(cultivo => {
        const fila = document.createElement("tr");

        const valores = [
            cultivo.id_cultivo,
            cultivo.nombre,
            cultivo.parcela,
            fecha(cultivo.fecha_siembra),
            fecha(cultivo.fecha_cosecha_estimada),
            cultivo.estado
        ];

        valores.forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor ?? "";
            fila.appendChild(celda);
        });

        const acciones = document.createElement("td");

        const editar = document.createElement("button");
        editar.textContent = "Editar";
        editar.addEventListener("click", () => editarCultivo(cultivo));

        const eliminar = document.createElement("button");
        eliminar.textContent = "Eliminar";
        eliminar.className = "btn-eliminar";
        eliminar.addEventListener("click", () =>
            eliminarCultivo(cultivo.id_cultivo)
        );

        acciones.append(editar, eliminar);
        fila.appendChild(acciones);
        tabla.appendChild(fila);
    });
}

document.getElementById("btnNuevo").addEventListener("click", () => {
    formulario.reset();
    document.getElementById("cultivoId").value = "";
    document.getElementById("tituloFormulario").textContent =
        "Registrar cultivo";

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth" });
});

document.getElementById("btnCancelar").addEventListener("click", () => {
    panel.hidden = true;
    formulario.reset();
});

buscador.addEventListener("input", mostrarCultivos);

function editarCultivo(cultivo) {
    document.getElementById("cultivoId").value = cultivo.id_cultivo;
    selectorParcela.value = cultivo.id_parcela;
    document.getElementById("nombre").value = cultivo.nombre;
    document.getElementById("fechaSiembra").value =
        fecha(cultivo.fecha_siembra);
    document.getElementById("fechaCosecha").value =
        fecha(cultivo.fecha_cosecha_estimada);
    document.getElementById("estado").value = cultivo.estado;
    document.getElementById("observaciones").value =
        cultivo.observaciones || "";

    document.getElementById("tituloFormulario").textContent =
        "Editar cultivo";

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth" });
}

async function eliminarCultivo(id) {
    if (!confirm("¿Deseas eliminar este cultivo?")) return;

    try {
        await solicitar(`/api/cultivos/${id}`, {
            method: "DELETE"
        });

        await cargarCultivos();
        alert("Cultivo eliminado");
    } catch (error) {
        alert(error.message);
    }
}

formulario.addEventListener("submit", async evento => {
    evento.preventDefault();

    const id = document.getElementById("cultivoId").value;

    const datos = {
        id_parcela: Number(selectorParcela.value),
        nombre: document.getElementById("nombre").value.trim(),
        fecha_siembra: document.getElementById("fechaSiembra").value,
        fecha_cosecha_estimada:
            document.getElementById("fechaCosecha").value || null,
        estado: document.getElementById("estado").value,
        observaciones:
            document.getElementById("observaciones").value.trim()
    };

    try {
        await solicitar(
            id ? `/api/cultivos/${id}` : "/api/cultivos",
            {
                method: id ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datos)
            }
        );

        formulario.reset();
        panel.hidden = true;
        await cargarCultivos();

        alert(id ? "Cultivo actualizado" : "Cultivo registrado");
    } catch (error) {
        alert(error.message);
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    if (window.lucide) lucide.createIcons();

    try {
        await cargarParcelas();
    } catch (error) {
        console.error(error);
        alert("No se pudieron cargar las parcelas");
    }

    await cargarCultivos();
});
