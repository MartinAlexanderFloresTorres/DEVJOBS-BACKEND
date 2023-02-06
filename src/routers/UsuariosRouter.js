import { Router } from 'express'
import fileUpload from 'express-fileupload'
import { confirmar, crear, editar, eliminar, recuperacion, login, perfil, restablecer, verificarToken, obtenerPerfil } from '../controllers/UsuariosController.js'
import checkAuth from '../middlewares/checkAuth.js'
import ckeckUploadImage from '../middlewares/ckeckUploadImage.js'

const UsuariosRouter = Router()

// Crear
UsuariosRouter.post('/crear', crear)

// Confirmar
UsuariosRouter.get('/confirmar/:token', confirmar)

// Login
UsuariosRouter.post('/login', login)
UsuariosRouter.get('/perfil', checkAuth, perfil)

// Perfil
UsuariosRouter.get('/perfil/obtener/:id', obtenerPerfil)

// recuperacion
UsuariosRouter.post('/recuperacion', recuperacion)

// restablecer
UsuariosRouter.post('/restablecer/:token', restablecer)

// verificarToken
UsuariosRouter.get('/verificarToken/:token', verificarToken)

// Editar
UsuariosRouter.post('/editar/', fileUpload({ useTempFiles: false }), checkAuth, ckeckUploadImage, editar)

// Eliminar
UsuariosRouter.delete('/eliminar', checkAuth, eliminar)

export default UsuariosRouter
