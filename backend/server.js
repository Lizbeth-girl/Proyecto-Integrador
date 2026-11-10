
require("dotenv").config();

const express = require("express");
const path = require("path");

// INICIALIZAR APLICACIÓN

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// IMPORTAR RUTAS DE TODOS LOS MÓDULOS

// Módulo 1: Parcelas
const parcelasRoutes = require("./routes/parcelas.routes");

// Módulo 2: Cultivos
const cultivosRoutes = require("./routes/cultivos.routes");

// Módulo 3: Actividades
const actividadesRoutes = require("./routes/actividades.routes");

// Módulo 4: Cosechas
const cosechasRoutes = require("./routes/cosechas.routes");

// Módulo 5: Insumos
const insumosRoutes = require("./routes/insumos.routes");

// Módulo 6: Trabajadores
const trabajadoresRoutes = require("./routes/trabajadores.routes");

// Módulo 7: Asignaciones
const asignacionesRoutes = require("./routes/asignaciones.routes");

// Módulo 8: Clientes
const clientesRoutes = require("./routes/clientes.routes");

// Módulo 9: Ventas
const ventasRoutes = require("./routes/ventas.routes");

// ========================================
// REGISTRAR LAS API REST
// ========================================

app.use("/api/parcelas", parcelasRoutes);

app.use("/api/cultivos", cultivosRoutes);

app.use("/api/actividades", actividadesRoutes);

app.use("/api/cosechas", cosechasRoutes);

app.use("/api/insumos", insumosRoutes);

app.use("/api/trabajadores", trabajadoresRoutes);

app.use("/api/asignaciones", asignacionesRoutes);

app.use("/api/clientes", clientesRoutes);

// API de Ventas
// Incluye:
// GET    /api/ventas
// GET    /api/ventas/disponibilidad
// POST   /api/ventas
// PATCH  /api/ventas/:id/anular

app.use("/api/ventas", ventasRoutes);

// ========================================
// CONFIGURAR ARCHIVOS DEL FRONTEND
// ========================================

const frontendPath = path.join(__dirname, "../frontend");

app.use(express.static(frontendPath));

// Página principal
app.get("/", (req, res) => {
    res.sendFile(
        path.join(frontendPath, "index.html")
    );
});

// ========================================
// RUTAS NO ENCONTRADAS
// ========================================

// API que no existe
app.use("/api", (req, res) => {
    res.status(404).json({
        error: "La ruta API solicitada no existe"
    });
});

// ========================================
// MANEJO GENERAL DE ERRORES
// ========================================

app.use((err, req, res, next) => {
    console.error("Error del servidor:", err);

    res.status(500).json({
        error: "Ocurrió un error interno en el servidor"
    });
});

// ========================================
// INICIAR SERVIDOR
// ========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log("");
    console.log("======================================");
    console.log("       AGROGESTIÓN - SERVIDOR");
    console.log("======================================");

    console.log(`Servidor activo: http://localhost:${PORT}`);

    console.log("");
    console.log("MÓDULOS DISPONIBLES:");

    console.log("1. Parcelas");
    console.log("   /api/parcelas");

    console.log("2. Cultivos");
    console.log("   /api/cultivos");

    console.log("3. Actividades");
    console.log("   /api/actividades");

    console.log("4. Cosechas");
    console.log("   /api/cosechas");

    console.log("5. Insumos");
    console.log("   /api/insumos");

    console.log("6. Trabajadores");
    console.log("   /api/trabajadores");

    console.log("7. Asignaciones");
    console.log("   /api/asignaciones");

    console.log("8. Clientes");
    console.log("   /api/clientes");

    console.log("9. Ventas");
    console.log("   /api/ventas");

    console.log("10. Disponibilidad de cosechas");
    console.log("    /api/ventas/disponibilidad");

    console.log("");
    console.log("Frontend:");
    console.log(`http://localhost:${PORT}/index.html`);

    console.log("");
    console.log("Sistema listo para recibir solicitudes.");
    console.log("======================================");
});
