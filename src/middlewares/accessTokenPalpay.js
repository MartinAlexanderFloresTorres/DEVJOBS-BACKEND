const accessTokenPalpay = async (req, res, next) => {
  try {
    // GENERAR API AUTH
    const PAYPAL_API_AUTH = Buffer.from(`${process.env.PAYPAL_API_CLIENT}:${process.env.PAYPAL_API_SECRET}`).toString('base64')

    // GENERAR TOKEN
    const res_token = await fetch(`${process.env.PAYPAL_API_REST}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${PAYPAL_API_AUTH}`
      },
      body: 'grant_type=client_credentials'
    })

    // OBTENER ACCESS TOKEN
    const { access_token } = await res_token.json()

    if (!access_token) return res.status(500).json({ msg: 'No se pudo obtener el access token' })

    // AGREGAR ACCESS TOKEN A LA REQUEST
    req.access_token = access_token

    next()
  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: 'Hubo un error' })
  }
}

export default accessTokenPalpay
