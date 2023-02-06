import mongoose from 'mongoose'
import shortid from 'shortid'
import slug from 'slug'

const VacanteSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: true,
      trim: true
    },
    empresa: {
      type: String,
      trim: true
    },
    ubicacion: {
      type: String,
      trim: true,
      required: true
    },
    salario: {
      type: String,
      trim: true,
      default: 0
    },
    contrato: {
      type: String,
      trim: true,
      required: true
    },
    descripcion: {
      type: String,
      trim: true,
      required: true
    },
    url: {
      type: String,
      lowercase: true
    },
    skills: [
      {
        id: Number,
        nombre: String
      }
    ],
    candidatos: [
      {
        nombre: String,
        email: String,
        web: String,
        cv: Object,
        aceptado: {
          type: Boolean,
          default: false
        },
        isEstadoCambiado: {
          type: Boolean,
          default: false
        }
      }
    ],
    requeridos: {
      type: Number,
      default: 1
    },
    creador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    caduca: {
      type: Date,
      default: null
    }
  },
  {
    // crea dos columnas de creado y actualizado
    timestamps: true
  }
)

const Vacante = mongoose.model('Vacante', VacanteSchema)
export default Vacante
