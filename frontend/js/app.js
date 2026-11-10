
async function cargarIndicador(ruta, idElemento) {
    const elemento = document.getElementById(idElemento);

    if (!elemento) return;

    try {
        const respuesta = await fetch(`/api/${ruta}`);

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const registros = await respuesta.json();

        if (!Array.isArray(registros)) {
            throw new Error("La API no devolvió una lista");
        }

        if (ruta === "ventas") {
            elemento.textContent = registros.filter(
                venta => venta.estado === "Registrada"
            ).length;
        } else {
            elemento.textContent = registros.length;
        }

    } catch (error) {
        console.error(`Error en ${ruta}:`, error);
        elemento.textContent = "Error";
    }
}

async function cargarDashboard() {
    await Promise.all([
        cargarIndicador("parcelas", "totalParcelas"),
        cargarIndicador("cultivos", "totalCultivos"),
        cargarIndicador("actividades", "totalActividades"),
        cargarIndicador("cosechas", "totalCosechas"),
        cargarIndicador("trabajadores", "totalTrabajadores"),
        cargarIndicador("ventas", "totalVentas")
    ]);
}

document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    cargarDashboard();
});
