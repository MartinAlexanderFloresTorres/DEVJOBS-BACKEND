import { Router } from 'express'
import fileupload from 'express-fileupload'
import checkAuth from '../middlewares/checkAuth.js'
import ckeckUploadPdf from '../middlewares/ckeckUploadPdf.js'
import { cambiarEstadoCandidato, agregarCandidato, crear, editar, eliminar, eliminarCandidato, mostrar, mostrarCantidatosVacante, mostrarVacante, mostrarVacantesCreador, buscarVacantes } from '../controllers/VacantesController.js'

const VacantesRouter = Router()

// Crear
VacantesRouter.post('/crear', checkAuth, crear)

// Editar
VacantesRouter.post('/editar/:url', checkAuth, editar)

// Eliminar
VacantesRouter.delete('/eliminar/:url', checkAuth, eliminar)

// Mostrar
VacantesRouter.get('/mostrar', mostrar)

// Buscar vacantes
VacantesRouter.get('/buscar/:query', buscarVacantes)

// Mostrar por creador
VacantesRouter.get('/mostrar/creador', checkAuth, mostrarVacantesCreador)

// Mostrar por url
VacantesRouter.get('/mostrar/:url', mostrarVacante)

// Agregar candidato
VacantesRouter.post('/agregar-candidato/:url', fileupload({ useTempFiles: false }), ckeckUploadPdf, agregarCandidato)

// Mostar candidatos
VacantesRouter.get('/mostrar-candidatos/:url', checkAuth, mostrarCantidatosVacante)

// Eliminar candidato
VacantesRouter.delete('/eliminar-candidato/:url', checkAuth, eliminarCandidato)

// Estado candidato
VacantesRouter.post('/estado-candidato/:url', checkAuth, cambiarEstadoCandidato)

export default VacantesRouter
