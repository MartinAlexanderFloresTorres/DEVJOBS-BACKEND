import slug from 'slug'
import deleteImages from '../cloudinary/deleteImages.js'
import Vacante from '../models/Vacante.js'
import shortid from 'shortid'
import avisoCandidato from '../emails/avisoCandidato.js'
import aviso from '../emails/aviso.js'

/* 
  plan

  1: free
  2: basic
  3: premium
  4: enterprise


  plan: {
    type: Number,
    enum: [1, 2, 3, 4],
    default: 1
  }
 */

export const crear = async (req, res) => {
  try {
    const { usuario } = req

    // Validar datos del formulario
    const { titulo, empresa, ubicacion, salario, contrato, descripcion, skills, requeridos } = req.body
    if (!titulo || !empresa || !ubicacion || !salario || !contrato || !descripcion || !skills || skills?.length < 1 || !requeridos || requeridos < 1) {
      return res.status(400).json({ msg: 'Todos los campos son obligatorios' })
    }

    // Obtener las vacantes del usuario
    const vacantes = await Vacante.find({ creador: usuario._id })

    // Validar el plan del usuario
    if (usuario.plan === 1) {
      if (vacantes.length >= 2) {
        return res.status(401).json({ msg: 'El plan free solo permite 2 vacantes' })
      }

      if (requeridos > 10) {
        return res.status(401).json({ msg: 'El plan free solo permite 10 candidatos' })
      }
    }

    if (usuario.plan === 2) {
      if (vacantes.length >= 10) {
        return res.status(401).json({ msg: 'El plan basic solo permite 10 vacantes' })
      }

      if (requeridos > 50) {
        return res.status(401).json({ msg: 'El plan basic solo permite 50 candidatos' })
      }
    }

    if (usuario.plan === 3) {
      if (vacantes.length >= 25) {
        return res.status(401).json({ msg: 'El plan premium solo permite 25 vacantes' })
      }

      if (requeridos > 200) {
        return res.status(401).json({ msg: 'El plan premium solo permite 200 candidatos' })
      }
    }

    if (usuario.plan === 4) {
      if (vacantes.length >= 45) {
        return res.status(401).json({ msg: 'El plan premium solo permite 45 vacantes' })
      }
    }

    // Crear una nueva vacante
    const vacante = new Vacante(req.body)

    vacante.creador = usuario._id
    vacante.url = `${slug(vacante.titulo)}-${shortid.generate()}`

    // Plan free caduca en 15 dias
    if (usuario.plan === 1) {
      // 15 dias
      vacante.caduca = new Date(Date.now() + 1296000000) // 1296000000 = 15 dias
    }

    // Guardar vacante
    const saveVacante = await vacante.save()

    res.json(saveVacante)
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const editar = async (req, res) => {
  try {
    const { usuario } = req
    const { url } = req.params

    // Validar datos del formulario
    const { titulo, empresa, ubicacion, salario, contrato, descripcion, skills, requeridos } = req.body
    if (!titulo || !empresa || !ubicacion || !salario || !contrato || !descripcion || !skills || skills?.length < 1 || !requeridos || requeridos < 1) {
      return res.status(400).json({ msg: 'Todos los campos son obligatorios' })
    }

    // Obtener la vacante
    const vacante = await Vacante.findOne({ url })

    // Validar que la vacante exista
    if (!vacante) {
      return res.status(404).json({ msg: 'Vacante no encontrada' })
    }

    // Validar que el usuario sea el creador de la vacante
    if (usuario._id.toString() !== vacante.creador.toString()) {
      return res.status(401).json({ msg: 'No autorizado' })
    }

    // Si el numero de requeridos es menor a 1 , ya se cerro la vacante
    if (vacante.requeridos < 1) {
      return res.status(401).json({ msg: 'Vacante cerrada' })
    }

    // Validar el plan del usuario
    if (usuario.plan === 1) {
      if (requeridos > 10) {
        return res.status(401).json({ msg: 'El plan free solo permite 10 candidatos' })
      }
    }

    if (usuario.plan === 2) {
      if (requeridos > 50) {
        return res.status(401).json({ msg: 'El plan basic solo permite 50 candidatos' })
      }
    }

    if (usuario.plan === 3) {
      if (requeridos > 200) {
        return res.status(401).json({ msg: 'El plan premium solo permite 200 candidatos' })
      }
    }

    // Actualizar vacante
    vacante.titulo = titulo
    vacante.empresa = empresa
    vacante.ubicacion = ubicacion
    vacante.salario = salario
    vacante.contrato = contrato
    vacante.descripcion = descripcion
    vacante.skills = skills
    vacante.requeridos = requeridos
    vacante.url = `${slug(vacante.titulo)}-${shortid.generate()}`

    // Guardar vacante
    const saveVacante = await vacante.save()

    res.json(saveVacante)
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const eliminar = async (req, res) => {
  try {
    const { usuario } = req
    const { url } = req.params

    // Obtener la vacante
    const vacante = await Vacante.findOne({ url })

    if (!vacante) {
      return res.status(404).json({ msg: 'Vacante no encontrada' })
    }

    // Validar que el usuario sea el creador de la vacante
    if (usuario._id.toString() !== vacante.creador.toString()) {
      return res.status(401).json({ msg: 'No autorizado' })
    }

    // Eliminar los pdfs de los candidatos
    if (vacante.candidatos.length > 0) {
      await Promise.all(
        vacante.candidatos.map(async (candidato) => {
          const { cv } = candidato
          return await deleteImages({ folder: 'devjobs/pdf', public_id: cv.public_id })
        })
      )
    }

    // Eliminar vacante
    await vacante.delete()
    res.json({ msg: 'Vacante eliminada correctamente' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const mostrar = async (req, res) => {
  try {
    /* 
      - Mostras primero las vacantes que tienes requeridos mayores a 0 
      - mostrar primero las vacantes que su creador tiene un plan 
        4- enterprise, 
        3- premium , 
        2- basic, 
        1- free
     */
    const vacantes = await Vacante.find().populate('creador', 'plan')

    const vacantesOrdenadas = vacantes.sort((a, b) => {
      /* 
        - Mostras primero las vacantes que tienes requeridos mayores a 0
        - mostrar primero las vacantes que su creador tiene un plan
          4- enterprise,
          3- premium ,
          2- basic,
          1- free        
       */
      if (a.requeridos > 0 && b.requeridos > 0) {
        if (a.creador.plan > b.creador.plan) {
          return -1
        }
        if (a.creador.plan < b.creador.plan) {
          return 1
        }
        return 0
      }
      if (a.requeridos > 0 && b.requeridos < 1) {
        return -1
      }
      if (a.requeridos < 1 && b.requeridos > 0) {
        return 1
      }
      return 0
    })

    res.json(vacantesOrdenadas)
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const buscarVacantes = async (req, res) => {
  try {
    const { query } = req.params

    if (!query) {
      return res.status(400).json({ msg: 'No hay nada que buscar' })
    }

    const regex = new RegExp(query, 'i')

    // buscar por titulo, descripcion, empresa, ubicacion y tambien que ordene por mas requeridos
    const vacantes = await Vacante.find({
      $or: [{ titulo: regex }, { descripcion: regex }, { empresa: regex }, { ubicacion: regex }]
    })
      .sort({ requeridos: -1 })
      .populate('creador', 'plan')

    const vacantesOrdenadas = vacantes.sort((a, b) => {
      /* 
        - Mostras primero las vacantes que tienes requeridos mayores a 0
        - mostrar primero las vacantes que su creador tiene un plan
          4- enterprise,
          3- premium ,
          2- basic,
          1- free        
       */
      if (a.requeridos > 0 && b.requeridos > 0) {
        if (a.creador.plan > b.creador.plan) {
          return -1
        }
        if (a.creador.plan < b.creador.plan) {
          return 1
        }
        return 0
      }
      if (a.requeridos > 0 && b.requeridos < 1) {
        return -1
      }
      if (a.requeridos < 1 && b.requeridos > 0) {
        return 1
      }
      return 0
    })

    res.json(vacantesOrdenadas)
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const mostrarVacantesCreador = async (req, res) => {
  try {
    const { usuario } = req
    const vacantes = await Vacante.find({ creador: usuario._id }).populate('creador', 'plan')
    res.json(vacantes)
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const mostrarVacante = async (req, res) => {
  try {
    const { url } = req.params

    const vacante = await Vacante.findOne({ url }).populate('creador', 'nombre email foto plan')

    if (!vacante) {
      return res.status(404).json({ msg: 'Vacante no encontrada' })
    }

    res.json(vacante)
  } catch (error) {
    console.log(error)
    res.status(404).json({ msg: 'Vacante no encontrada' })
  }
}

export const agregarCandidato = async (req, res) => {
  try {
    const { pdf, vacante } = req
    const { nombre, email, web } = req.body

    // Crear el candidato
    const nuevoCandidato = {
      nombre,
      email,
      web,
      cv: pdf
    }

    // Agregarlo a la vacante
    vacante.candidatos = [...vacante.candidatos, nuevoCandidato]

    // Enviar email al creador de la vacante
    avisoCandidato({
      email,
      nombre,
      titulo: `Has solicitado el puesto de ${vacante.titulo} en ${vacante.empresa}`,
      mensaje: `Has solicitado el puesto de ${vacante.titulo} en ${vacante.empresa} en DevJobs es un gusto informarte que tu solicitud ha sido recibida y estamos revisando tu perfil, en breve nos pondremos en contacto contigo.`,
      puesto: vacante.titulo,
      empresa: vacante.empresa
    })

    // Guardar la vacante
    const vacanteGuardado = await vacante.save()

    res.json({ msg: 'Postulado exitosamente', vacante: vacanteGuardado })
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const mostrarCantidatosVacante = async (req, res) => {
  try {
    const { usuario } = req
    const { url } = req.params

    const vacante = await Vacante.findOne({ url })

    if (!vacante) {
      return res.status(404).json({ msg: 'Vacante no encontrada' })
    }

    if (usuario._id.toString() !== vacante.creador.toString()) {
      return res.status(401).json({ msg: 'No autorizado' })
    }

    res.json(vacante)
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const eliminarCandidato = async (req, res) => {
  try {
    const { url } = req.params
    const { id } = req.body

    // Obtener la vacante
    const vacante = await Vacante.findOne({ url }).populate('creador', 'plan')

    if (!vacante) {
      return res.status(404).json({ msg: 'Vacante no encontrada' })
    }

    /* 
       Si el plan es 
       1 - free no se puede eliminar el candidato
     */

    if (vacante.creador.plan === 1) {
      return res.status(401).json({ msg: 'El plan free no permite eliminar candidatos' })
    }

    // Obtener el candidato
    const candidato = vacante.candidatos.id(id)

    // Eliminar el pdf del candidato
    await deleteImages({ folder: 'devjobs/pdf', public_id: candidato.cv.public_id })

    // Eliminar el candidato
    candidato.remove()

    // Guardar la vacante
    await vacante.save()

    res.json(vacante)
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const cambiarEstadoCandidato = async (req, res) => {
  try {
    const { url } = req.params
    const { id, aceptado } = req.body

    // Obtener la vacante
    const vacante = await Vacante.findOne({ url }).populate('creador', 'nombre email')

    if (!vacante) {
      return res.status(404).json({ msg: 'Vacante no encontrada' })
    }

    // Obtener el candidato
    const candidato = vacante.candidatos.id(id)

    // Si el candidato no existe
    if (!candidato) {
      return res.status(404).json({ msg: 'Candidato no encontrado' })
    }

    // Si el candidato ya fue aceptado o rechazado
    if (candidato.isEstadoCambiado) {
      if (candidato.aceptado) {
        return res.status(400).json({ msg: 'El candidato ya fue aceptado' })
      } else {
        return res.status(400).json({ msg: 'El candidato ya fue rechazado' })
      }
    }

    // Si los requeridos son menos a 1, no se puede aceptar
    if (vacante.requeridos < 1) {
      return res.status(400).json({ msg: 'La vacante alcanzó el número de empleados requeridos' })
    }

    // Enviar email al candidato
    if (aceptado) {
      // Actualizar los requeridos de la vacante
      vacante.requeridos -= 1
      avisoCandidato({
        email: candidato.email,
        nombre: candidato.nombre,
        titulo: `Tu solicitud para el puesto de ${vacante.titulo} ha sido aceptada`,
        mensaje: `Felicidades, tu postulación para el puesto de ${vacante.titulo} en ${vacante.empresa} ha sido aceptada. Te invitamos a que te comuniques con la empresa para continuar con el proceso de selección.`,
        puesto: vacante.titulo,
        empresa: vacante.empresa
      })
    } else {
      avisoCandidato({
        email: candidato.email,
        nombre: candidato.nombre,
        titulo: `Tu solicitud para el puesto de ${vacante.titulo} ha sido rechazada`,
        mensaje: `Gracias por tu interés en el puesto de ${vacante.titulo} en ${vacante.empresa}. Hemos decidido no seguir con el proceso de selección, aunque agradecemos enormemente tu tiempo e interés en DevJobs.`,
        puesto: vacante.titulo,
        empresa: vacante.empresa
      })
    }

    // Actualizar el estado del candidato
    candidato.aceptado = aceptado
    candidato.isEstadoCambiado = true

    const vacanteActualizada = await vacante.save()

    // Si los requeridos son menos a 1
    if (vacanteActualizada.requeridos < 1) {
      // Enviar email a todos los candidatos que no han sido aceptados
      vacanteActualizada.candidatos.map(async (candidato) => {
        if (!candidato.isEstadoCambiado) {
          await avisoCandidato({
            email: candidato.email,
            nombre: candidato.nombre,
            titulo: `La vacante de ${vacanteActualizada.titulo} en ${vacanteActualizada.empresa} ha cerrado su proceso de selección`,
            mensaje: `La vacante de ${vacanteActualizada.titulo} en ${vacanteActualizada.empresa} ya no está disponible, te invitamos a que te postules a otras vacantes que se encuentran disponibles en DevJobs.`,
            puesto: vacanteActualizada.titulo,
            empresa: vacanteActualizada.empresa
          })
        }
      })

      // Enviar email a la empresa
      await aviso({
        email: vacante.creador.email,
        nombre: vacante.creador.nombre,
        titulo: `La vacante de ${vacante.titulo} en ${vacante.empresa} ha finalizado su proceso de selección`,
        mensaje: `La vacante de ${vacante.titulo} en ${vacante.empresa} ya finalizó su proceso de selección, te invitamos a que crees una nueva vacante para que puedas seguir recibiendo postulaciones de los mejores candidatos.`
      })
    }

    res.json(vacanteActualizada)
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}
