import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { prisma } from './db'
import { authRouter } from './routes/auth.routes'
import { ticketRouter } from './routes/ticket.routes'
import { studentRouter } from './routes/student.routes'
import { chatRouter } from './routes/chat.routes'
import { kbRouter } from './routes/kb.routes'
import { metricsRouter } from './routes/metrics.routes'
import { adminRouter } from './routes/admin.routes'
import { appointmentRouter } from './routes/appointment.routes'

dotenv.config()

const app = express()

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-role', 'x-user-id', 'x-demo-role', 'x-demo-user-id']
}))
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ limit: '25mb', extended: true }))

// Health check
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'connected', system: 'Álvaro AI API Backend', timestamp: new Date().toISOString(), version: '1.0.0' })
  } catch (error: any) {
    console.error('DATABASE_HEALTH_FAILURE', { name: error.name, code: error.code, cause: error.meta?.driverAdapterError?.cause?.kind, message: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[database URL]').slice(-500) })
    res.status(503).json({ status: 'degraded', database: 'unavailable', system: 'Álvaro AI API Backend', timestamp: new Date().toISOString() })
  }
})

// Routes
app.use('/api/auth', authRouter)
app.use('/api/tickets', ticketRouter)
app.use('/api/students', studentRouter)
app.use('/api/chat', chatRouter)
app.use('/api/knowledge-base', kbRouter)
app.use('/api/kb', kbRouter)
app.use('/api/metrics', metricsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/appointments', appointmentRouter)

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err)
  res.status(500).json({ error: 'Erro interno do servidor', details: err.message })
})


export default app
