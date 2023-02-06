import { Router } from 'express'
import { CapturarOrden, CrearOrden, EliminarPlan } from '../controllers/PagosController.js'
import checkAuth from '../middlewares/checkAuth.js'
import accessTokenPalpay from '../middlewares/accessTokenPalpay.js'

const PagosRoutes = Router()

// Crear orden
PagosRoutes.post('/crear-orden', checkAuth, accessTokenPalpay, CrearOrden)

// Capturar orden
PagosRoutes.post('/capturar-orden', checkAuth, accessTokenPalpay, CapturarOrden)

// Eliminar plan
PagosRoutes.delete('/eliminar-plan/:id', checkAuth, EliminarPlan)

export default PagosRoutes
