import cron from 'node-cron'
import Usuario from '../models/Usuario.js'
import Vacante from '../models/Vacante.js'
import aviso from '../emails/aviso.js'
import deleteImages from '../cloudinary/deleteImages.js'

// 0 0 */15 * * -> cada 15 dias a las 00:00:00
// 0 0 */10 * * -> cada 10 dias a las 00:00:00
// 10 segundos ->

// EJECUTAR TAREA CADA 15 DIAS
export default cron.schedule('0 0 */10 * *', () => {
  console.log('Ejecutando tarea (verificacion de planes) cada 15 dias')
  /* 
    1 - Free
    2 - Basic
    3 - Premium
    4 - Enterprise
   */

  // Recorrer todos los usuarios y el que tenga el plan 2, 3 o 4, se le coloca el plan 1
  Usuario.find({
    plan: {
      $in: [2, 3, 4]
    }
  })
    .select('-password -token -confirmado -createdAt -updatedAt -__v')
    .then((usuarios) => {
      usuarios.forEach((usuario) => {
        console.log(usuario)

        // Si la fecha de expiración es menor a la fecha actual (ya expiro) se le coloca el plan 1
        if (usuario.fechaPlanCaduca < new Date()) {
          usuario.plan = 1
          usuario.renovar = false
          usuario.fechaPlanCaduca = null
          usuario.save()
          // Enviar Email avisando que el plan ha expirado
          aviso({
            email: usuario.email,
            nombre: usuario.nombre,
            titulo: 'Tu plan ha expirado',
            mensaje: 'Tu plan ha expirado, por favor, renueva tu plan para seguir publicando vacantes.'
          })
        }
        // Si el la fecha esta a punto de expirar, se le envia un email avisando
        else if (usuario.fechaPlanCaduca < new Date(new Date().setDate(new Date().getDate() + 5))) {
          // 5 dias antes de expirar
          usuario.renovar = true
          usuario.save()
          aviso({
            email: usuario.email,
            nombre: usuario.nombre,
            titulo: 'Tu plan esta a punto de expirar en 5 Dias',
            mensaje: `Tu plan esta a punto de expirar, por favor, renueva tu plan para seguir publicando vacantes. <a href="${process.env.FRONTEND_URL}/planes/${usuario.plan}">Ver Plan</a>`
          })
        }
      })
    })

  // Recorrer todas las Vacantes que tenga el creador plan 1, se le elimina sus vacantes
  Vacante.find()
    .populate('creador', 'plan email nombre')
    .then((vacantes) => {
      vacantes.forEach((vacante) => {
        // Si el creador de la vacante tiene el plan 1, se elimina la vacante
        if (vacante.creador.plan === 1) {
          // Eliminar los pdfs de los candidatos
          if (vacante.caduca < new Date()) {
            if (vacante.candidatos.length > 0) {
              Promise.all(
                vacante.candidatos.map(async (candidato) => {
                  const { cv } = candidato
                  return await deleteImages({ folder: 'devjobs/pdf', public_id: cv.public_id })
                })
              )
            }

            // Eliminar la vacante
            vacante.remove()

            // Enviar Email avisando que la vacante ha sido eliminada
            aviso({
              email: vacante.creador.email,
              nombre: vacante.creador.nombre,
              titulo: 'Tus vacantes han sido eliminadas',
              mensaje: 'Tus vacantes han sido eliminadas, por favor, renueva tu plan para seguir publicando vacantes.'
            })
          }
          // 5 dias antes de expirar
          else if (vacante.caduca < new Date(new Date().setDate(new Date().getDate() + 5))) {
            aviso({
              email: vacante.creador.email,
              nombre: vacante.creador.nombre,
              titulo: 'El plan Grautito esta a punto de expirar  en 5 Dias',
              mensaje: `El plan Grautito ya pronto llega a sus 15 dia, Actualize su plan o se elimaran pronto tus vacantes creadas. <a href="${process.env.FRONTEND_URL}/planes/${vacante.creador.plan}">Ver Plan</a>`
            })
          }
        }
      })
    })
})
