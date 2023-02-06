import { writeFileSync, unlinkSync } from 'fs'
import ValidarImagenes from '../helpers/ValidarImagenes.js'
import shortid from 'shortid'
import uploadImages from '../cloudinary/uploadImages.js'

const ckeckUploadImage = async (req, res, next) => {
  // Subir imagen
  if (req.files) {
    if (req.files.file) {
      // Obtener imagen
      const { file } = req.files
      // Obtener extencion
      const extencion = file.name.split('.').pop()

      // Validar extencion
      if (!ValidarImagenes({ tipo: file.mimetype })) {
        return res.status(400).json({ msg: 'La extención no es válida' })
      }

      // Generar nombre con la ruta
      const path = `./public/uploads/perfiles/${shortid.generate()}.${extencion}`

      // Guardar imagen
      writeFileSync(path, file.data)

      // Subir imagen
      const data = await uploadImages({ path, folder: 'devjobs/usuarios' })

      // Extraer datos
      const { public_id, secure_url, original_filename } = data
      // Guardar el el req.foto
      req.foto = { public_id, secure_url, original_filename }

      // Eliminar imagen
      unlinkSync(path)
    }
  }

  next()
}

export default ckeckUploadImage
