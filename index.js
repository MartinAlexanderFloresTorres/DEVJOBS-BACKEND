import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { v2 as cloudinary } from 'cloudinary'
import conectarDB from './src/config/db.js'
import VacantesRouter from './src/routers/VacantesRouter.js'
import UsuariosRouter from './src/routers/UsuariosRouter.js'
import PagosRoutes from './src/routers/PagosRoutes.js'
import './src/helpers/RemovePlanMes.js'

// APP
const app = express()

// BODY PARSER
app.use(express.json())

// ENV
dotenv.config()

// CORS
app.use(cors({ origin: process.env.FRONTEND_URL }))

// MONGOOSE
conectarDB()

// Configurar cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_NAME,
  secure: true
})

// RUTAS
app.use('/api/vacantes', VacantesRouter)
app.use('/api/usuarios', UsuariosRouter)
app.use('/api/pagos', PagosRoutes)

// PUERTO
const PORT = process.env.PORT || 4000

// RUN
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto: ${PORT}`)
})
