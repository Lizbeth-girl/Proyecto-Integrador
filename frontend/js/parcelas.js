
const btnNueva = document.getElementById("btnNueva");
const btnCancelar = document.getElementById("btnCancelar");
const panelFormulario = document.getElementById("panelFormulario");
const formParcela = document.getElementById("formParcela");
const buscarParcela = document.getElementById("buscarParcela");
const tablaParcelas = document.getElementById("tablaParcelas");

let parcelas = [];

// CONSULTAR PARCELAS

async function cargarParcelas() {
    try {
        const respuesta = await fetch("/api/parcelas");

        if (!respuesta.ok) {
            throw new Error("Error al consultar parcelas");
        }

        parcelas = await respuesta.json();

        mostrarParcelas();

    } catch (error) {
        console.error(error);

        tablaParcelas.innerHTML =
            '<tr><td colspan="6">Error al cargar parcelas</td></tr>';
    }
}

// MOSTRAR PARCELAS

function mostrarParcelas() {

    const texto = buscarParcela.value.trim().toLowerCase();

    const filtradas = parcelas.filter(parcela =>
        String(parcela.nombre || "")
            .toLowerCase().includes(texto) ||
        String(parcela.ubicacion || "")
            .toLowerCase().includes(texto) ||
        String(parcela.estado || "")
            .toLowerCase().includes(texto)
    );

    tablaParcelas.innerHTML = "";

    if (filtradas.length === 0) {
        tablaParcelas.innerHTML =
            '<tr><td colspan="6">No hay parcelas registradas</td></tr>';
        return;
    }

    filtradas.forEach(parcela => {

        const fila = document.createElement("tr");

        const valores = [
            parcela.id_parcela,
            parcela.nombre,
            parcela.ubicacion,
            `${parcela.superficie} ha`,
            parcela.estado
        ];

        valores.forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor ?? "";
            fila.appendChild(celda);
        });

        const acciones = document.createElement("td");

        // EDITAR

        const btnEditar = document.createElement("button");
        btnEditar.textContent = "Editar";

        btnEditar.addEventListener("click", () => {
            editarParcela(parcela);
        });

        // ELIMINAR

        const btnEliminar = document.createElement("button");
        btnEliminar.textContent = "Eliminar";
        btnEliminar.classList.add("btn-eliminar");

        btnEliminar.addEventListener("click", () => {
            eliminarParcela(parcela.id_parcela);
        });

        acciones.append(btnEditar, btnEliminar);
        fila.appendChild(acciones);

        tablaParcelas.appendChild(fila);
    });
}

// ABRIR FORMULARIO

btnNueva.addEventListener("click", () => {

    formParcela.reset();

    document.getElementById("parcelaId").value = "";

    document.getElementById("tituloFormulario").textContent =
        "Registrar parcela";

    panelFormulario.hidden = false;

    panelFormulario.scrollIntoView({
        behavior: "smooth"
    });
});

// CANCELAR

btnCancelar.addEventListener("click", () => {

    formParcela.reset();
    panelFormulario.hidden = true;

});

// BUSCADOR

buscarParcela.addEventListener("input", mostrarParcelas);

// EDITAR PARCELA

function editarParcela(parcela) {

    document.getElementById("parcelaId").value =
        parcela.id_parcela;

    document.getElementById("nombre").value =
        parcela.nombre;

    document.getElementById("ubicacion").value =
        parcela.ubicacion;

    document.getElementById("superficie").value =
        parcela.superficie;

    document.getElementById("estado").value =
        parcela.estado;

    document.getElementById("tituloFormulario").textContent =
        "Editar parcela";

    panelFormulario.hidden = false;

    panelFormulario.scrollIntoView({
        behavior: "smooth"
    });
}

// ELIMINAR PARCELA

async function eliminarParcela(id) {

    if (!confirm("¿Deseas eliminar esta parcela?")) {
        return;
    }

    try {

        const respuesta = await fetch(
            `/api/parcelas/${id}`,
            {
                method: "DELETE"
            }
        );

        if (!respuesta.ok) {
            const datos = await respuesta.json();
            throw new Error(datos.error || "Error al eliminar");
        }

        await cargarParcelas();

        alert("Parcela eliminada correctamente");

    } catch (error) {
        alert(error.message);
    }
}

// GUARDAR PARCELA

formParcela.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const id = document.getElementById("parcelaId").value;

    const datos = {
        nombre:
            document.getElementById("nombre").value.trim(),

        ubicacion:
            document.getElementById("ubicacion").value.trim(),

        superficie:
            Number(document.getElementById("superficie").value),

        estado:
            document.getElementById("estado").value
    };

    if (
        !datos.nombre ||
        !datos.ubicacion ||
        !Number.isFinite(datos.superficie) ||
        datos.superficie <= 0 ||
        !datos.estado
    ) {
        alert("Completa correctamente todos los campos");
        return;
    }

    try {

        const respuesta = await fetch(
            id ? `/api/parcelas/${id}` : "/api/parcelas",
            {
                method: id ? "PUT" : "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(datos)
            }
        );

        if (!respuesta.ok) {
            const error = await respuesta.json();

            throw new Error(
                error.error || "Error al guardar la parcela"
            );
        }

        formParcela.reset();
        panelFormulario.hidden = true;

        await cargarParcelas();

        alert(
            id
                ? "Parcela actualizada correctamente"
                : "Parcela registrada correctamente"
        );

    } catch (error) {
        alert(error.message);
    }
});

// INICIAR MÓDULO E ICONOS

document.addEventListener("DOMContentLoaded", () => {

    if (window.lucide) {
        lucide.createIcons();
    }

    cargarParcelas();
});
