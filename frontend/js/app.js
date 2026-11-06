
async function cargarDashboard() {
    const modulos = [
        { ruta: "parcelas", elemento: "totalParcelas" },
        { ruta: "cultivos", elemento: "totalCultivos" }
    ];

    for (const modulo of modulos) {
        const elemento = document.getElementById(modulo.elemento);

        try {
            const respuesta = await fetch(`/api/${modulo.ruta}`);

            if (!respuesta.ok) {
                throw new Error("Error al consultar " + modulo.ruta);
            }

            const registros = await respuesta.json();
            elemento.textContent = registros.length;

        } catch (error) {
            console.error(error);
            elemento.textContent = "Error";
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    cargarDashboard();
});
