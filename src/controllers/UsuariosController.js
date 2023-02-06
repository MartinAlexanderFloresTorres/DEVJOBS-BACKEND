import shortid from 'shortid'
import Usuario from '../models/Usuario.js'
import emailRegistro from '../emails/emailRegistro.js'
import emailOlvidePassword from '../emails/emailOlvidePassword.js'
import deleteImages from '../cloudinary/deleteImages.js'
import generarJWT from '../helpers/generar_jwt.js'
import Vacante from '../models/Vacante.js'
import aviso from '../emails/aviso.js'

export const crear = async (req, res) => {
  try {
    const { nombre, email, password, password2 } = req.body

    // Validar que no haya campos vacios
    if (!nombre || !email || !password || !password2) {
      return res.status(400).json({ msg: 'Todos los campos son obligatorios' })
    }

    // Validar que el password sea igual
    if (password !== password2) {
      return res.status(400).json({ msg: 'Los passwords no son iguales' })
    }

    // Verificar que el usuario no exista
    const existe = await Usuario.findOne({ email })

    if (existe) {
      return res.status(400).json({ msg: 'Ya existe un usuario con ese email' })
    }

    // Crear usuario
    const usuario = new Usuario({ nombre, email, password })

    // Generar token
    usuario.token = shortid.generate()

    // Enviar email
    emailRegistro({ email: usuario.email, nombre: usuario.nombre, token: usuario.token })

    // Guardar usuario
    await usuario.save()

    res.status(201).json({ msg: 'Usuario creado correctamente, Verifique su bandeja de email para confirmar su cuenta.' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const confirmar = async (req, res) => {
  try {
    const { token } = req.params

    // Buscar usuario por token
    const existe = await Usuario.findOne({ token })

    if (!existe) {
      return res.status(400).json({ msg: 'El token no es válido' })
    }

    // Verificar que el usuario ya esta confirmado
    if (existe.confirmado) {
      return res.status(400).json({ msg: 'El usuario ya está confirmado' })
    }

    // Borrar el token
    existe.token = null

    // Confirmar usuario
    existe.confirmado = true

    // Guardar usuario
    await existe.save()

    res.json({ msg: 'Usuario confirmado correctamente' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Validar que no haya campos vacios
    if (!email || !password) {
      return res.status(400).json({ msg: 'Todos los campos son obligatorios' })
    }

    // Verificar que el usuario exista
    const usuario = await Usuario.findOne({ email })

    if (!usuario) {
      return res.status(400).json({ msg: 'El usuario no existe' })
    }

    // Verificar que el usuario este confirmado
    if (!usuario.confirmado) {
      return res.status(400).json({ msg: 'El usuario no está confirmado' })
    }

    // Verificar que el password sea correcto
    if (!usuario.comprobarPassword(password)) {
      return res.status(400).json({ msg: 'El password es incorrecto' })
    }

    // Generar jwt
    const jwt = generarJWT({ id: usuario._id })

    const user = {
      _id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      foto: usuario.foto,
      plan: usuario.plan,
      renovar: usuario.renovar,
      fechaPlanCaduca: usuario.fechaPlanCaduca
    }

    res.json({ msg: 'Inicio de sesión correcta', jwt, user })
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const obtenerPerfil = async (req, res) => {
  try {
    const { id } = req.params

    // Verificar que el usuario exista
    const usuario = await Usuario.findById(id).select('-password -token -confirmado -__v')

    if (!usuario) {
      return res.status(400).json({ msg: 'El usuario no existe' })
    }

    res.json(usuario)
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'ID del Perfil Invalido' })
  }
}

export const perfil = async (req, res) => {
  try {
    const { usuario } = req
    res.json(usuario)
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const editar = async (req, res) => {
  try {
    const { usuario, foto } = req
    const { nombre, email, password, checkPassword, password2, password3 } = req.body

    // Si el usuario quiere cambiar el password
    if (!checkPassword) {
      // Validar que no haya campos vacios
      if (!password || !password2 || !password3) {
        console.log('Todos los campos son obligatorios')
        return res.status(400).json({ msg: 'Todos los campos son obligatorios' })
      }
      // Validar que el password sea igual
      if (password2 !== password3) {
        return res.status(400).json({ msg: 'Los passwords no son iguales' })
      }
    }

    // Validar que no haya campos vacios
    if (!nombre || !email) {
      return res.status(400).json({ msg: 'Todos los campos son obligatorios' })
    }

    if (usuario.email !== email) {
      // Verificar que el usuario no exista
      const existe = await Usuario.findOne({ email })

      if (existe) {
        return res.status(400).json({ msg: 'Ya existe un usuario con ese email' })
      }
    }

    // Obtener usuario
    const usuarioEncontrado = await Usuario.findById(usuario._id)

    // No existe el usuario
    if (!usuarioEncontrado) {
      return res.status(400).json({ msg: 'El usuario no existe' })
    }

    if (!checkPassword) {
      // Verificar que el password sea correcto
      if (!usuarioEncontrado.comprobarPassword(password)) {
        return res.status(400).json({ msg: 'El password es incorrecto' })
      }
    }

    // Actualizar usuario
    usuarioEncontrado.nombre = nombre
    if (!checkPassword) {
      usuarioEncontrado.password = password2
    }
    if (usuario.email !== email) {
      usuarioEncontrado.email = email
    }

    // Existe una imagen
    if (req.files) {
      // Verificar que halla una imagen
      if (req.files.file) {
        // Eliminar imagen anterior
        if (usuarioEncontrado.foto) {
          await deleteImages({ public_id: usuarioEncontrado.foto.public_id, folder: 'devjobs/usuarios' })
        }

        usuarioEncontrado.foto = foto
      }
    }

    // Guardar usuario
    const usuarioGuardado = await usuarioEncontrado.save()

    const user = {
      _id: usuarioGuardado._id,
      nombre: usuarioGuardado.nombre,
      email: usuarioGuardado.email,
      foto: usuarioGuardado.foto,
      plan: usuario.plan,
      renovar: usuario.renovar,
      fechaPlanCaduca: usuario.fechaPlanCaduca
    }

    res.json({ user, msg: 'Usuario editado correctamente' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const eliminar = async (req, res) => {
  try {
    const { usuario } = req

    // Obtener usuario
    const usuarioEncontrado = await Usuario.findById(usuario._id)

    // No existe el usuario

    if (!usuarioEncontrado) {
      return res.status(400).json({ msg: 'El usuario no existe' })
    }

    // El usuario es el mismo que esta logueado
    if (usuario._id.toString() !== usuarioEncontrado._id.toString()) {
      return res.status(400).json({ msg: 'No tienes permiso para eliminar este usuario' })
    }

    // Eliminar imagen anterior
    if (usuarioEncontrado.foto) {
      await deleteImages({ public_id: usuarioEncontrado.foto.public_id, folder: 'devjobs/usuarios' })
    }

    // Obtener sus vacantes
    const vacantes = await Vacante.find({ creador: usuario._id })

    // Eliminar los pdfs de sus vacantes
    vacantes.map((vacante) => {
      return vacante.candidatos.map(async (candidato) => {
        return await deleteImages({ folder: 'devjobs/pdf', public_id: candidato.cv.public_id })
      })
    })

    // Promise.all
    await Promise.all([
      await Vacante.deleteMany({ creador: usuario._id }),

      // Eliminar usuario
      await usuarioEncontrado.delete()
    ])

    // Enviar email
    aviso({
      email: usuarioEncontrado.email,
      nombre: usuarioEncontrado.nombre,
      titulo: 'Tu cuenta ha sido eliminada',
      mensaje: 'Tu cuenta ha sido eliminada correctamente de DevJobs y todas tus vacantes han sido eliminadas, esperamos que vuelvas pronto'
    })

    res.json({ msg: 'Usuario eliminado correctamente' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const recuperacion = async (req, res) => {
  try {
    const { email } = req.body

    // Validar que no haya campos vacios
    if (!email) {
      return res.status(400).json({ msg: 'Todos los campos son obligatorios' })
    }

    // Verificar que el usuario exista
    const usuario = await Usuario.findOne({ email })

    if (!usuario) {
      return res.status(400).json({ msg: 'El usuario no existe' })
    }

    // Generar token
    usuario.token = shortid.generate()

    // Enviar email
    emailOlvidePassword({ email: usuario.email, nombre: usuario.nombre, token: usuario.token })

    // Guardar usuario
    await usuario.save()

    res.json({ msg: 'Verifique su bandeja de email para recuperar su cuenta.' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const restablecer = async (req, res) => {
  try {
    const { token } = req.params
    const { password, password2 } = req.body

    // Validar que no haya campos vacios
    if (!password || !password2 || !token) {
      return res.status(400).json({ msg: 'Todos los campos son obligatorios' })
    }

    // Verificar que el password sea correcto
    if (password !== password2) {
      return res.status(400).json({ msg: 'Los passwords no coinciden' })
    }

    // Verificar que el usuario exista
    const usuario = await Usuario.findOne({ token })

    if (!usuario) {
      return res.status(400).json({ msg: 'El usuario no existe' })
    }

    // Borrar el token
    usuario.token = null

    // Asignar el nuevo password
    usuario.password = password

    // Guardar usuario
    await usuario.save()

    res.json({ msg: 'Password restablecido correctamente' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const verificarToken = async (req, res) => {
  try {
    const { token } = req.params

    // Buscar usuario por token
    const usuario = await Usuario.findOne({ token })

    if (!usuario) {
      return res.status(400).json({ msg: 'El token no es válido' })
    }

    res.status(200).json({ msg: 'Token válido' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}
