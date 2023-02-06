import deleteImages from '../cloudinary/deleteImages.js'
import aviso from '../emails/aviso.js'
import Vacante from '../models/Vacante.js'

export const CrearOrden = async (req, res) => {
  try {
    const { usuario } = req
    const { access_token } = req

    const { plan, precio, descripcion } = req.body

    // validar
    if (!plan || !precio || !descripcion) {
      return res.status(400).json({
        msg: 'Todos los campos son obligatorios'
      })
    }

    // Si el usuario tiene un plan activo no puede comprar otro a menos que tenga un plan mas bajo
    // 1, 2, 3, 4 (Gratis, Basic, Premium, Enterprise)
    if (usuario.plan > plan) {
      return res.status(400).json({
        msg: 'Ya tienes un plan activo, no puedes comprar uno inferior'
      })
    }

    // GENERAR ORDER
    const order = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: precio
          },
          description: descripcion,
          // quiero agregar un campo personalizado para saber que plan es
          custom_id: plan
        }
      ],

      application_context: {
        brand_name: 'Dev Jobs',
        shipping_preference: 'NO_SHIPPING',
        locale: 'es-ES',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        return_url: `${process.env.FRONTEND_URL}/checkout/success`,
        cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel`
      }
    }

    // CREAR ORDEN
    const respuesta = await fetch(`${process.env.PAYPAL_API_REST}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`
      },
      body: JSON.stringify(order)
    })

    // OBTENER DATA
    const data = await respuesta.json()

    res.json(data)
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const CapturarOrden = async (req, res) => {
  try {
    const { usuario } = req
    const { access_token } = req
    const { token, PayerID } = req.body

    // VALIDAR
    if (!token || !PayerID) {
      return res.status(400).json({
        msg: 'Token y PayerID son obligatorios'
      })
    }

    // CAPTURAR ORDEN
    const respuesta = await fetch(`${process.env.PAYPAL_API_REST}/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`
      },
      body: JSON.stringify({
        payer_id: PayerID
      })
    })

    // OBTENER DATA
    const data = await respuesta.json()

    // VALIDAR SI LA ORDEN FUE CAPTURADA
    if (data.status === 'COMPLETED') {
      const { custom_id, amount } = data.purchase_units[0].payments.captures[0]

      // Obtener el precio
      const precio = Number(amount.value)

      // Obtener el email y nombre del usuario
      const {
        email_address,
        name: { given_name, surname }
      } = data.payer

      // Validar plan custom_id
      const plan = Number(custom_id)

      // 1, 2, 3, 4 (Gratis, Basic, Premium, Enterprise)
      const planNuevo = plan > 4 ? 4 : plan < 1 ? 1 : plan

      // Plan nombr
      const planNombre = ['Gratis', 'Basic', 'Premium', 'Enterprise'][planNuevo - 1]

      // Actualizar el plan del usuario
      usuario.plan = planNuevo

      // Generar fecha actual
      const fecha = new Date()

      // Generar fecha de expiración En un mes mas a la fecha actual
      const fechaCaducidad = new Date(fecha.setMonth(fecha.getMonth() + 1))

      // Generar fecha de expiración
      usuario.fechaPlanCaduca = fechaCaducidad
      usuario.renovar = false

      // Guardar usuario
      await usuario.save()

      // ENVIAR EMAIL
      Promise.all([
        // ENVIAR EMAIL AL USUARIO
        aviso({
          email: usuario.email,
          nombre: `${usuario.nombre}`,
          titulo: 'Pago realizado',
          mensaje: 'Tu pago se realizó correctamente y ya puedes publicar tu oferta de trabajo con tu plan seleccionado'
        }),

        // ENVIAR EMAIL A ADMIN
        aviso({
          email: process.env.EMAIL_ADMIN,
          nombre: process.env.NOMBRE_ADMIN,
          titulo: 'Se realizó un pago de planes en Dev Jobs',
          mensaje: `El usuario ${given_name} ${surname} con email en devjob (<a href="mailto:${usuario.email}">${usuario.email}</a>), con email en paypal (<a href="mailto:${email_address}">${email_address}</a>) realizó un pago de ${precio} USD por el plan ${planNombre} en Dev Jobs`
        })
      ])
    }

    res.json(data)
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export const EliminarPlan = async (req, res) => {
  try {
    const { id } = req.params
    const { usuario } = req

    // Validar que el usuario sea el dueño del plan
    if (usuario.id.toString() !== id) {
      return res.status(401).json({ msg: 'No autorizado' })
    }

    // Vacantes del usuario
    const vacantes = await Vacante.find({ creador: usuario._id })

    // Eliminar vacantes
    vacantes.forEach(async (vacante) => {
      // Eliminar los pdfs de los candidatos
      if (vacante.candidatos.length > 0) {
        await Promise.all(
          vacante.candidatos.map(async (candidato) => {
            const { cv } = candidato
            return await deleteImages({ folder: 'devjobs/pdf', public_id: cv.public_id })
          })
        )
      }
      await vacante.remove()
    })

    // Actualizar el plan del usuario a 1 (Free)
    usuario.plan = 1
    usuario.renovar = false
    usuario.fechaPlanCaduca = null

    // Guardar usuario
    await usuario.save()

    // ENVIAR EMAIL
    aviso({
      email: usuario.email,
      nombre: `${usuario.nombre}`,
      titulo: 'Plan eliminado',
      mensaje: 'Tu plan ha sido eliminado correctamente y se han eliminado todas tus vacantes, Se le estableció el plan Free'
    })

    res.json({ msg: 'Plan eliminado correctamente', usuario })
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}
