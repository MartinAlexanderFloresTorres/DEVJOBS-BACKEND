import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const UsuarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    trim: true
  },
  foto: {
    type: Object,
    default: null
  },
  token: {
    type: String,
    default: null
  },
  confirmado: {
    type: Boolean,
    default: false
  },
  plan: {
    type: Number,
    enum: [1, 2, 3, 4],
    default: 1
  },
  // Fecha de caducidad del plan
  fechaPlanCaduca: {
    type: Date,
    default: null
  },
  renovar: {
    type: Boolean,
    default: false
  }
})

// HOOKS
UsuarioSchema.pre('save', async function (next) {
  // Si el password ya esta hasheado
  if (!this.isModified('password')) {
    return next()
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)

  // NEXT
  next()
})

// METHODS
// comparar password
UsuarioSchema.methods.comprobarPassword = function (passwordUser) {
  return bcrypt.compareSync(passwordUser, this.password)
}

const Usuario = mongoose.model('Usuario', UsuarioSchema)

export default Usuario
