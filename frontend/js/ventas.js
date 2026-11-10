
const tablaVentas = document.getElementById("tablaVentas");
const tablaDetalle = document.getElementById("tablaDetalle");
const formulario = document.getElementById("formVenta");
const panel = document.getElementById("panelFormulario");

const selectorCliente = document.getElementById("clienteVenta");
const selectorCosecha = document.getElementById("cosechaVenta");

const cantidadInput = document.getElementById("cantidadVenta");
const precioInput = document.getElementById("precioVenta");

const buscador = document.getElementById("buscarVenta");
const filtroEstado = document.getElementById("filtroEstado");

let ventas = [];
let clientes = [];
let cosechas = [];
let productos = [];

const dinero = valor =>
    "$ " + Number(valor || 0).toFixed(2);

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

// CARGAR VENTAS
async function cargarVentas() {
    try {
        ventas = await solicitar("/api/ventas");

        if (!Array.isArray(ventas)) {
            throw new Error("Respuesta inválida de la API");
        }

        mostrarVentas();
        actualizarResumen();

    } catch (error) {
        console.error(error);

        tablaVentas.innerHTML =
            '<tr><td colspan="7">Error al cargar ventas</td></tr>';

        ["totalVentas", "totalIngresos", "totalAnuladas"]
            .forEach(id => {
                document.getElementById(id).textContent = "Error";
            });
    }
}

// INDICADORES
function actualizarResumen() {
    const registradas = ventas.filter(
        v => v.estado === "Registrada"
    );

    const anuladas = ventas.filter(
        v => v.estado === "Anulada"
    );

    const ingresos = registradas.reduce(
        (total, venta) => total + Number(venta.total),
        0
    );

    document.getElementById("totalVentas").textContent =
        registradas.length;

    document.getElementById("totalIngresos").textContent =
        dinero(ingresos);

    document.getElementById("totalAnuladas").textContent =
        anuladas.length;
}

// CREAR CELDAS DE TABLA SEGURAS
function agregarCelda(fila, texto) {
    const celda = document.createElement("td");
    celda.textContent = texto ?? "";
    fila.appendChild(celda);
    return celda;
}

// MOSTRAR HISTORIAL
function mostrarVentas() {
    const texto = buscador.value.trim().toLowerCase();
    const estado = filtroEstado.value;

    const filtradas = ventas.filter(venta => {
        const productosVenta = (venta.detalles || [])
            .map(d => d.cultivo)
            .join(" ");

        const coincideTexto = [
            venta.id_venta,
            venta.cliente,
            productosVenta
        ].some(valor =>
            String(valor || "").toLowerCase().includes(texto)
        );

        return coincideTexto &&
            (!estado || venta.estado === estado);
    });

    tablaVentas.innerHTML = "";

    if (!filtradas.length) {
        tablaVentas.innerHTML =
            '<tr><td colspan="7">No se encontraron ventas</td></tr>';
        return;
    }

    filtradas.forEach(venta => {
        const fila = document.createElement("tr");

        const nombresProductos = (venta.detalles || [])
            .map(d => d.cultivo)
            .join(", ");

        [
            venta.id_venta,
            venta.fecha_venta,
            venta.cliente,
            nombresProductos || "—",
            dinero(venta.total)
        ].forEach(valor => agregarCelda(fila, valor));

        const estadoCelda = document.createElement("td");
        const etiqueta = document.createElement("span");

        etiqueta.textContent = venta.estado;
        etiqueta.className = "estado-venta " +
            (venta.estado === "Anulada"
                ? "estado-anulada"
                : "estado-registrada");

        estadoCelda.appendChild(etiqueta);
        fila.appendChild(estadoCelda);

        const acciones = document.createElement("td");
        acciones.className = "acciones-venta";

        const ver = document.createElement("button");
        ver.type = "button";
        ver.textContent = "Ver detalle";
        ver.addEventListener("click", () => {
            verDetalle(venta);
        });
        acciones.appendChild(ver);

        if (venta.estado === "Registrada") {
            const anular = document.createElement("button");
            anular.type = "button";
            anular.textContent = "Anular";
            anular.className = "btn-eliminar";

            anular.addEventListener("click", () => {
                anularVenta(venta.id_venta);
            });

            acciones.appendChild(anular);
        }

        fila.appendChild(acciones);
        tablaVentas.appendChild(fila);
    });
}

// CARGAR CLIENTES Y COSECHAS DISPONIBLES
async function cargarOpciones() {
    const [datosClientes, datosCosechas] = await Promise.all([
        solicitar("/api/clientes"),
        solicitar("/api/ventas/disponibilidad")
    ]);

    clientes = datosClientes;
    cosechas = datosCosechas;

    selectorCliente.innerHTML =
        '<option value="">Venta sin cliente registrado</option>';

    clientes.forEach(cliente => {
        const opcion = document.createElement("option");
        opcion.value = cliente.id_cliente;
        opcion.textContent = cliente.nombre;
        selectorCliente.appendChild(opcion);
    });

    selectorCosecha.innerHTML =
        '<option value="">Seleccione una cosecha</option>';

    cosechas.forEach(cosecha => {
        const opcion = document.createElement("option");

        opcion.value = cosecha.id_cosecha;
        opcion.textContent =
            `${cosecha.cultivo} — ${cosecha.parcela} — ` +
            `${Number(cosecha.disponible).toFixed(2)} ` +
            `${cosecha.unidad_medida} disponibles`;

        opcion.disabled = Number(cosecha.disponible) <= 0;

        selectorCosecha.appendChild(opcion);
    });
}

// MOSTRAR DISPONIBILIDAD
function actualizarDisponibilidad() {
    const cosecha = cosechas.find(
        c => String(c.id_cosecha) === selectorCosecha.value
    );

    const texto = document.getElementById("disponibilidadTexto");

    if (!cosecha) {
        texto.textContent =
            "Selecciona una cosecha para consultar existencias.";
        cantidadInput.placeholder = "Ej. 10.00";
        cantidadInput.removeAttribute("max");
        return;
    }

    const disponible = Number(cosecha.disponible);

    texto.textContent =
        `Disponible: ${disponible.toFixed(2)} ` +
        `${cosecha.unidad_medida}`;

    cantidadInput.placeholder =
        `Máximo ${disponible.toFixed(2)}`;

    cantidadInput.max = disponible;
}

selectorCosecha.addEventListener(
    "change",
    actualizarDisponibilidad
);

// NUEVA VENTA
document.getElementById("btnNuevaVenta").addEventListener(
    "click",
    async () => {
        try {
            await cargarOpciones();

            formulario.reset();
            productos = [];

            actualizarDetalle();
            actualizarDisponibilidad();

            panel.hidden = false;
            panel.scrollIntoView({ behavior: "smooth" });

        } catch (error) {
            alert("No se pudo preparar el formulario: " + error.message);
        }
    }
);

// AGREGAR PRODUCTO
document.getElementById("btnAgregarProducto").addEventListener(
    "click",
    () => {
        const cosecha = cosechas.find(
            c => String(c.id_cosecha) === selectorCosecha.value
        );

        const cantidad = Number(cantidadInput.value);
        const precio = Number(precioInput.value);

        if (!cosecha) {
            alert("Selecciona una cosecha");
            return;
        }

        if (
            !Number.isFinite(cantidad) ||
            cantidad <= 0 ||
            cantidadInput.value === "" ||
            !Number.isFinite(precio) ||
            precio <= 0 ||
            precioInput.value === ""
        ) {
            alert("Ingresa una cantidad y un precio válidos");
            return;
        }

        if (
            Math.abs(cantidad * 100 - Math.round(cantidad * 100)) > 1e-7 ||
            Math.abs(precio * 100 - Math.round(precio * 100)) > 1e-7
        ) {
            alert("Utiliza máximo dos decimales");
            return;
        }

        if (cantidad > Number(cosecha.disponible)) {
            alert("La cantidad supera la disponibilidad de la cosecha");
            return;
        }

        if (
            productos.some(p =>
                p.id_cosecha === Number(cosecha.id_cosecha)
            )
        ) {
            alert("Esa cosecha ya está agregada");
            return;
        }

        productos.push({
            id_cosecha: Number(cosecha.id_cosecha),
            cultivo: cosecha.cultivo,
            unidad_medida: cosecha.unidad_medida,
            cantidad,
            precio_unitario: precio,
            subtotal: Math.round(cantidad * precio * 100) / 100
        });

        selectorCosecha.value = "";
        cantidadInput.value = "";
        precioInput.value = "";

        actualizarDetalle();
        actualizarDisponibilidad();
    }
);

// ACTUALIZAR TABLA DE PRODUCTOS
function actualizarDetalle() {
    tablaDetalle.innerHTML = "";

    if (!productos.length) {
        tablaDetalle.innerHTML =
            '<tr><td colspan="5">Agrega al menos un producto</td></tr>';
    }

    productos.forEach((producto, indice) => {
        const fila = document.createElement("tr");

        [
            producto.cultivo,
            `${producto.cantidad} ${producto.unidad_medida}`,
            dinero(producto.precio_unitario),
            dinero(producto.subtotal)
        ].forEach(valor => agregarCelda(fila, valor));

        const acciones = document.createElement("td");
        const quitar = document.createElement("button");

        quitar.type = "button";
        quitar.textContent = "Quitar";
        quitar.className = "btn-eliminar";

        quitar.addEventListener("click", () => {
            productos.splice(indice, 1);
            actualizarDetalle();
        });

        acciones.appendChild(quitar);
        fila.appendChild(acciones);
        tablaDetalle.appendChild(fila);
    });

    const total = productos.reduce(
        (acumulado, p) => acumulado + p.subtotal,
        0
    );

    document.getElementById("totalFormulario").textContent =
        dinero(total);
}

// GUARDAR VENTA
formulario.addEventListener("submit", async evento => {
    evento.preventDefault();

    if (!productos.length) {
        alert("Agrega al menos un producto a la venta");
        return;
    }

    const boton = document.getElementById("btnGuardarVenta");
    boton.disabled = true;

    try {
        const datos = {
            id_cliente: selectorCliente.value
                ? Number(selectorCliente.value)
                : null,

            detalles: productos.map(p => ({
                id_cosecha: p.id_cosecha,
                cantidad: p.cantidad,
                precio_unitario: p.precio_unitario
            }))
        };

        await solicitar("/api/ventas", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        formulario.reset();
        productos = [];
        panel.hidden = true;

        await cargarVentas();
        alert("Venta registrada correctamente");

    } catch (error) {
        alert(error.message);

        // Recargar existencias por si cambiaron
        // después de abrir el formulario.
        try {
            await cargarOpciones();
            actualizarDisponibilidad();
        } catch (e) {
            console.error(e);
        }
    } finally {
        boton.disabled = false;
    }
});

// VER DETALLES DE UNA VENTA
function verDetalle(venta) {
    const detallePanel = document.getElementById("panelDetalle");
    const contenido = document.getElementById("contenidoDetalle");

    document.getElementById("tituloDetalle").textContent =
        `Detalle de venta #${venta.id_venta}`;

    contenido.replaceChildren();

    const informacion = document.createElement("p");
    informacion.textContent =
        `Cliente: ${venta.cliente} | ` +
        `Fecha: ${venta.fecha_venta} | Estado: ${venta.estado}`;

    contenido.appendChild(informacion);

    (venta.detalles || []).forEach(producto => {
        const bloque = document.createElement("div");
        bloque.className = "detalle-producto";

        const titulo = document.createElement("strong");
        titulo.textContent =
            `${producto.cultivo} — ${producto.parcela}`;

        const datos = document.createElement("p");
        datos.textContent =
            `${producto.cantidad} ${producto.unidad_medida} × ` +
            `${dinero(producto.precio_unitario)} = ` +
            dinero(producto.subtotal);

        bloque.append(titulo, datos);
        contenido.appendChild(bloque);
    });

    const total = document.createElement("h3");
    total.textContent = `Total: ${dinero(venta.total)}`;
    contenido.appendChild(total);

    detallePanel.hidden = false;
    detallePanel.scrollIntoView({ behavior: "smooth" });
}

// ANULAR VENTA
async function anularVenta(id) {
    if (!confirm(
        `¿Deseas anular la venta #${id}? ` +
        "Se conservará en el historial."
    )) {
        return;
    }

    try {
        await solicitar(`/api/ventas/${id}/anular`, {
            method: "PATCH"
        });

        document.getElementById("panelDetalle").hidden = true;

        await cargarVentas();
        alert("Venta anulada correctamente");

    } catch (error) {
        alert(error.message);
    }
}

// CANCELAR Y CERRAR FORMULARIOS
document.getElementById("btnCancelarVenta").addEventListener(
    "click",
    () => {
        formulario.reset();
        productos = [];
        actualizarDetalle();
        panel.hidden = true;
    }
);

document.getElementById("btnCerrarDetalle").addEventListener(
    "click",
    () => {
        document.getElementById("panelDetalle").hidden = true;
    }
);

// FILTROS
buscador.addEventListener("input", mostrarVentas);
filtroEstado.addEventListener("change", mostrarVentas);

// INICIAR
document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    cargarVentas();
});
