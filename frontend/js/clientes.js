
const tabla = document.getElementById("tablaClientes");
const formulario = document.getElementById("formCliente");
const panel = document.getElementById("panelFormulario");

const buscador = document.getElementById("buscarCliente");
const filtroContacto = document.getElementById("filtroContacto");

let clientes = [];

// COMUNICACIÓN CON LA API
async function solicitar(url, opciones = {}) {
    const respuesta = await fetch(url, opciones);
    const tipo = respuesta.headers.get("content-type") || "";

    if (!tipo.includes("application/json")) {
        throw new Error(
            `El servidor no devolvió JSON (${respuesta.status})`
        );
    }

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.error || "Error en la solicitud");
    }

    return datos;
}

// CARGAR CLIENTES
async function cargarClientes() {
    try {
        clientes = await solicitar("/api/clientes");

        if (!Array.isArray(clientes)) {
            throw new Error("La API no devolvió una lista");
        }

        mostrarClientes();
        actualizarResumen();

    } catch (error) {
        console.error(error);

        tabla.innerHTML =
            '<tr><td colspan="7">Error al cargar clientes</td></tr>';

        [
            "totalClientes",
            "totalTelefonos",
            "totalCorreos"
        ].forEach(id => {
            document.getElementById(id).textContent = "Error";
        });
    }
}

// INDICADORES
function actualizarResumen() {
    document.getElementById("totalClientes").textContent =
        clientes.length;

    document.getElementById("totalTelefonos").textContent =
        clientes.filter(c => Boolean(c.telefono?.trim())).length;

    document.getElementById("totalCorreos").textContent =
        clientes.filter(c => Boolean(c.correo?.trim())).length;
}

// MOSTRAR CLIENTES
function mostrarClientes() {
    const texto = buscador.value.trim().toLowerCase();
    const contacto = filtroContacto.value;

    const filtrados = clientes.filter(cliente => {
        const coincideTexto = [
            cliente.nombre,
            cliente.identificacion,
            cliente.telefono,
            cliente.direccion,
            cliente.correo
        ].some(valor =>
            String(valor || "").toLowerCase().includes(texto)
        );

        let coincideContacto = true;

        if (contacto === "telefono") {
            coincideContacto = Boolean(cliente.telefono);
        } else if (contacto === "correo") {
            coincideContacto = Boolean(cliente.correo);
        } else if (contacto === "sin-contacto") {
            coincideContacto =
                !cliente.telefono && !cliente.correo;
        }

        return coincideTexto && coincideContacto;
    });

    tabla.innerHTML = "";

    if (!filtrados.length) {
        tabla.innerHTML =
            '<tr><td colspan="7">No se encontraron clientes</td></tr>';
        return;
    }

    filtrados.forEach(cliente => {
        const fila = document.createElement("tr");

        const valores = [
            cliente.id_cliente,
            cliente.nombre,
            cliente.identificacion || "—",
            cliente.telefono || "—",
            cliente.direccion || "—",
            cliente.correo || "—"
        ];

        valores.forEach((valor, indice) => {
            const celda = document.createElement("td");
            celda.textContent = valor ?? "";

            if (indice === 5 && cliente.correo) {
                celda.classList.add("correo-cliente");
            }

            fila.appendChild(celda);
        });

        // ACCIONES
        const acciones = document.createElement("td");
        acciones.classList.add("acciones-cliente");

        const editar = document.createElement("button");
        editar.type = "button";
        editar.textContent = "Editar";

        editar.addEventListener("click", () => {
            editarCliente(cliente);
        });

        const eliminar = document.createElement("button");
        eliminar.type = "button";
        eliminar.textContent = "Eliminar";
        eliminar.classList.add("btn-eliminar");

        eliminar.addEventListener("click", () => {
            eliminarCliente(cliente.id_cliente);
        });

        acciones.append(editar, eliminar);
        fila.appendChild(acciones);
        tabla.appendChild(fila);
    });
}

// NUEVO CLIENTE
document.getElementById("btnNuevo").addEventListener(
    "click",
    () => {
        formulario.reset();

        document.getElementById("clienteId").value = "";
        document.getElementById("tituloFormulario").textContent =
            "Registrar cliente";

        panel.hidden = false;
        panel.scrollIntoView({ behavior: "smooth" });
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

// FILTROS
buscador.addEventListener("input", mostrarClientes);
filtroContacto.addEventListener("change", mostrarClientes);

// EDITAR CLIENTE
function editarCliente(cliente) {
    document.getElementById("clienteId").value =
        cliente.id_cliente;

    document.getElementById("nombre").value =
        cliente.nombre;

    document.getElementById("identificacion").value =
        cliente.identificacion || "";

    document.getElementById("telefono").value =
        cliente.telefono || "";

    document.getElementById("direccion").value =
        cliente.direccion || "";

    document.getElementById("correo").value =
        cliente.correo || "";

    document.getElementById("tituloFormulario").textContent =
        "Editar cliente";

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth" });
}

// ELIMINAR CLIENTE
async function eliminarCliente(id) {
    if (!confirm("¿Deseas eliminar este cliente?")) {
        return;
    }

    try {
        await solicitar(`/api/clientes/${id}`, {
            method: "DELETE"
        });

        await cargarClientes();

        alert("Cliente eliminado correctamente");

    } catch (error) {
        alert(error.message);
    }
}

// GUARDAR O ACTUALIZAR
formulario.addEventListener("submit", async evento => {
    evento.preventDefault();

    const id = document.getElementById("clienteId").value;

    const datos = {
        nombre:
            document.getElementById("nombre").value.trim(),

        identificacion:
            document.getElementById("identificacion").value.trim(),

        telefono:
            document.getElementById("telefono").value.trim(),

        direccion:
            document.getElementById("direccion").value.trim(),

        correo:
            document.getElementById("correo").value.trim()
    };

    if (!datos.nombre) {
        alert("Ingresa el nombre completo del cliente");
        return;
    }

    try {
        await solicitar(
            id ? `/api/clientes/${id}` : "/api/clientes",
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

        await cargarClientes();

        alert(
            id
                ? "Cliente actualizado correctamente"
                : "Cliente registrado correctamente"
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

    cargarClientes();
});
