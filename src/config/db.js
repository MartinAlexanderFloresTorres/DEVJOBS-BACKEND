import mongoose from 'mongoose'

const conectarDB = async () => {
  try {
    mongoose.set('strictQuery', false)
    const db = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    const url = `${db.connection.host} : ${db.connection.port}`
    console.log(`MongoDB conectado en ${url}`)
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
}

export default conectarDB
