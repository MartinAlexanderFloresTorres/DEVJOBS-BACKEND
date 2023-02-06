import { writeFileSync, unlinkSync } from 'fs'
import shortid from 'shortid'
import uploadImages from '../cloudinary/uploadImages.js'
import Vacante from '../models/Vacante.js'

const ckeckUploadPdf = async (req, res, next) => {
  try {
    const { url } = req.params
    const { email, nombre, web } = req.body

    // Validar campos
    if (!nombre || !email || !web) {
      return res.status(400).json({ msg: 'Todos los campos son obligatorios' })
    }

    // Validar que el candidato no este registrado
    const vacante = await Vacante.findOne({ url }).populate('creador', 'plan')

    if (!vacante) {
      return res.status(404).json({ msg: 'Vacante no encontrada' })
    }

    // Validar plan del usuario
    /* 
        1- free Solo se pueden postular 10 personas
        2- basic Solo se pueden postular 50 personas
        3- premium Solo se pueden postular 200 personas
        4- enterprise ilimitado
     */

    // Si el plan es free
    if (vacante.creador.plan === 1) {
      // Si los candidatos son mas de 10, no se puede aceptar
      if (vacante.candidatos.length >= 10) {
        return res.status(400).json({ msg: 'La vacante alcanzó el número de empleados requeridos' })
      }
    }

    // Si el plan es basic
    if (vacante.creador.plan === 2) {
      // Si los candidatos son mas de 50, no se puede aceptar
      if (vacante.candidatos.length >= 50) {
        return res.status(400).json({ msg: 'La vacante alcanzó el número de empleados requeridos' })
      }
    }

    // Si el plan es premium
    if (vacante.creador.plan === 3) {
      // Si los candidatos son mas de 200, no se puede aceptar
      if (vacante.candidatos.length >= 200) {
        return res.status(400).json({ msg: 'La vacante alcanzó el número de empleados requeridos' })
      }
    }

    // Si los requeridos son menos a 1, no se puede aceptar
    if (vacante.requeridos < 1) {
      return res.status(400).json({ msg: 'La vacante alcanzó el número de empleados requeridos' })
    }

    // Verificar que el candidato no este registrado
    const candidato = vacante.candidatos.find((candidato) => candidato.email === email)

    if (candidato) {
      return res.status(400).json({ msg: 'El candidato ya esta registrado' })
    }

    // Subir pdf
    if (req.files) {
      if (req.files.file) {
        // Obtener file
        const { file } = req.files
        // Obtener extencion
        const extencion = file.name.split('.').pop()

        // Validar extencion
        if (file.mimetype !== 'application/pdf') {
          return res.status(400).json({ msg: 'La extención no es válida' })
        }

        // Generar nombre con la ruta
        const path = `./public/uploads/pdfs/${shortid.generate()}.${extencion}`

        // Guardar pdf
        writeFileSync(path, file.data)

        // Subir pdf
        const data = await uploadImages({ path, folder: 'devjobs/pdf' })

        // Extraer datos
        const { public_id, secure_url, original_filename } = data
        // Guardar el el req.pdf
        req.pdf = { public_id, secure_url, original_filename }

        // Eliminar pdf
        unlinkSync(path)
      }
    }

    req.vacante = vacante
    next()
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export default ckeckUploadPdf
