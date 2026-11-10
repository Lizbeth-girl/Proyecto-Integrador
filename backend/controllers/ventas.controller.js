
const pool = require("../config/database");

function idValido(valor) {
    return Number.isSafeInteger(Number(valor)) &&
        Number(valor) > 0;
}

function decimalValido(valor, permitirCero = false) {
    if (valor === "" || valor === null || valor === undefined) {
        return false;
    }

    const numero = Number(valor);

    return Number.isFinite(numero) &&
        (permitirCero ? numero >= 0 : numero > 0) &&
        Math.abs(numero * 100 - Math.round(numero * 100)) < 1e-7;
}

function manejarError(res, error) {
    console.error("Error en ventas:", error);

    if (error.code === "23503") {
        return res.status(409).json({
            error: "Uno de los registros relacionados no existe"
        });
    }

    if (["23514", "23502", "22003", "22P02"].includes(error.code)) {
        return res.status(400).json({
            error: "Los datos de la venta no son válidos"
        });
    }

    res.status(500).json({
        error: "No se pudo procesar la venta"
    });
}

// LISTADO DE VENTAS Y DETALLES
const obtenerVentas = async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                v.id_venta,
                v.id_cliente,
                COALESCE(c.nombre, 'Sin cliente') AS cliente,
                TO_CHAR(v.fecha_venta, 'YYYY-MM-DD HH24:MI')
                    AS fecha_venta,
                v.total,
                v.estado,
                detalle.detalles
            FROM ventas v
            LEFT JOIN clientes c
                ON c.id_cliente = v.id_cliente
            LEFT JOIN LATERAL (
                SELECT COALESCE(
                    json_agg(
                        json_build_object(
                            'id_detalle', d.id_detalle,
                            'id_cosecha', d.id_cosecha,
                            'cultivo', cu.nombre,
                            'parcela', p.nombre,
                            'cantidad', d.cantidad,
                            'unidad_medida', co.unidad_medida,
                            'precio_unitario', d.precio_unitario,
                            'subtotal', d.subtotal
                        )
                        ORDER BY d.id_detalle
                    ),
                    '[]'::json
                ) AS detalles
                FROM detalle_ventas d
                JOIN cosechas co
                    ON co.id_cosecha = d.id_cosecha
                JOIN cultivos cu
                    ON cu.id_cultivo = co.id_cultivo
                JOIN parcelas p
                    ON p.id_parcela = cu.id_parcela
                WHERE d.id_venta = v.id_venta
            ) detalle ON TRUE
            ORDER BY v.id_venta DESC
        `);

        res.json(resultado.rows);
    } catch (error) {
        manejarError(res, error);
    }
};

// CONSULTAR EXISTENCIAS DE LAS COSECHAS
const obtenerDisponibilidad = async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                co.id_cosecha,
                cu.nombre AS cultivo,
                p.nombre AS parcela,
                co.cantidad,
                co.unidad_medida,
                COALESCE(SUM(
                    CASE
                        WHEN v.estado = 'Registrada'
                        THEN d.cantidad
                        ELSE 0
                    END
                ), 0) AS cantidad_vendida,
                co.cantidad - COALESCE(SUM(
                    CASE
                        WHEN v.estado = 'Registrada'
                        THEN d.cantidad
                        ELSE 0
                    END
                ), 0) AS disponible
            FROM cosechas co
            JOIN cultivos cu
                ON cu.id_cultivo = co.id_cultivo
            JOIN parcelas p
                ON p.id_parcela = cu.id_parcela
            LEFT JOIN detalle_ventas d
                ON d.id_cosecha = co.id_cosecha
            LEFT JOIN ventas v
                ON v.id_venta = d.id_venta
            GROUP BY
                co.id_cosecha,
                cu.nombre,
                p.nombre
            ORDER BY co.id_cosecha DESC
        `);

        res.json(resultado.rows);
    } catch (error) {
        manejarError(res, error);
    }
};

// REGISTRAR VENTA CON TRANSACCIÓN
const crearVenta = async (req, res) => {
    const { id_cliente, detalles } = req.body || {};

    if (id_cliente != null &&
        id_cliente !== "" &&
        !idValido(id_cliente)) {
        return res.status(400).json({
            error: "Selecciona un cliente válido"
        });
    }

    if (!Array.isArray(detalles) || detalles.length === 0) {
        return res.status(400).json({
            error: "Agrega al menos un producto a la venta"
        });
    }

    for (const detalle of detalles) {
        if (
            !idValido(detalle.id_cosecha) ||
            !decimalValido(detalle.cantidad) ||
            !decimalValido(detalle.precio_unitario)
        ) {
            return res.status(400).json({
                error: "Revisa la cosecha, cantidad y precio unitario"
            });
        }
    }

    // Una cosecha solo puede aparecer una vez en la misma venta.
    const ids = detalles.map(d => Number(d.id_cosecha));

    if (new Set(ids).size !== ids.length) {
        return res.status(400).json({
            error: "No repitas la misma cosecha en una venta"
        });
    }

    const clienteBD = await pool.connect();

    try {
        await clienteBD.query("BEGIN");

        // Comprobar que el cliente existe.
        if (id_cliente != null && id_cliente !== "") {
            const cliente = await clienteBD.query(
                "SELECT id_cliente FROM clientes WHERE id_cliente = $1",
                [Number(id_cliente)]
            );

            if (!cliente.rows.length) {
                const error = new Error("El cliente no existe");
                error.status = 400;
                throw error;
            }
        }

        // Bloquear cosechas en orden para evitar ventas
        // simultáneas que superen las existencias.
        const cosechas = await clienteBD.query(`
            SELECT id_cosecha, cantidad
            FROM cosechas
            WHERE id_cosecha = ANY($1::integer[])
            ORDER BY id_cosecha
            FOR UPDATE
        `, [ids]);

        if (cosechas.rows.length !== ids.length) {
            const error = new Error("Una cosecha seleccionada no existe");
            error.status = 400;
            throw error;
        }

        // Consultar las cantidades ya vendidas.
        const vendidas = await clienteBD.query(`
            SELECT
                d.id_cosecha,
                COALESCE(SUM(d.cantidad), 0) AS vendido
            FROM detalle_ventas d
            JOIN ventas v ON v.id_venta = d.id_venta
            WHERE d.id_cosecha = ANY($1::integer[])
              AND v.estado = 'Registrada'
            GROUP BY d.id_cosecha
        `, [ids]);

        const vendidoPorCosecha = new Map(
            vendidas.rows.map(fila => [
                Number(fila.id_cosecha),
                Number(fila.vendido)
            ])
        );

        for (const cosecha of cosechas.rows) {
            const detalle = detalles.find(
                d => Number(d.id_cosecha) === cosecha.id_cosecha
            );

            const disponible =
                Number(cosecha.cantidad) -
                (vendidoPorCosecha.get(cosecha.id_cosecha) || 0);

            if (Number(detalle.cantidad) > disponible + 1e-8) {
                const error = new Error(
                    `La cosecha ${cosecha.id_cosecha} solo tiene ${disponible} disponibles`
                );
                error.status = 400;
                throw error;
            }
        }

        // CREAR CABECERA DE VENTA
        const nuevaVenta = await clienteBD.query(`
            INSERT INTO ventas (id_cliente, total, estado)
            VALUES ($1, 0, 'Registrada')
            RETURNING id_venta
        `, [
            id_cliente == null || id_cliente === ""
                ? null
                : Number(id_cliente)
        ]);

        const idVenta = nuevaVenta.rows[0].id_venta;

        
        // INSERTAR LOS DETALLES
        for (const detalle of detalles) {
            await clienteBD.query(
                `INSERT INTO detalle_ventas (
                    id_venta,
                    id_cosecha,
                    cantidad,
                    precio_unitario
                )
                VALUES ($1, $2, $3, $4)`,
                [
                    idVenta,
                    Number(detalle.id_cosecha),
                    Number(detalle.cantidad),
                    Number(detalle.precio_unitario)
                ]
            );
        }

            // ACTUALIZAR TOTAL REAL DE POSTGRESQL
            const actualizado = await clienteBD.query(`
            UPDATE ventas
            SET total = (
                SELECT COALESCE(SUM(subtotal), 0)
                FROM detalle_ventas
                WHERE id_venta = $1
            )
            WHERE id_venta = $1
            RETURNING *
        `, [idVenta]);

            await clienteBD.query("COMMIT");

            res.status(201).json(actualizado.rows[0]);

        } catch (error) {
            await clienteBD.query("ROLLBACK");

            if (error.status === 400) {
                return res.status(400).json({
                    error: error.message
                });
            }

            manejarError(res, error);
        } finally {
            clienteBD.release();
        }
    };

    // ANULAR VENTA SIN BORRAR EL HISTORIAL
    const anularVenta = async (req, res) => {
        const id = Number(req.params.id);

        if (!idValido(id)) {
            return res.status(400).json({
                error: "Identificador inválido"
            });
        }

        try {
            const resultado = await pool.query(`
            UPDATE ventas
            SET estado = 'Anulada'
            WHERE id_venta = $1
              AND estado = 'Registrada'
            RETURNING *
        `, [id]);

            if (!resultado.rows.length) {
                return res.status(404).json({
                    error: "La venta no existe o ya fue anulada"
                });
            }

            res.json({
                mensaje: "Venta anulada correctamente",
                venta: resultado.rows[0]
            });
        } catch (error) {
            manejarError(res, error);
        }
    };

    module.exports = {
        obtenerVentas,
        obtenerDisponibilidad,
        crearVenta,
        anularVenta
    };
