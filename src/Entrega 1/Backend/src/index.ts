import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
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
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-role', 'x-user-id', 'x-demo-role', 'x-demo-user-id']
}))
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ limit: '25mb', extended: true }))

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'Álvaro AI API Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor Álvaro AI Backend rodando em http://localhost:${PORT}`)
  console.log(`📡 Endpoints disponíveis em http://localhost:${PORT}/api`)
})

export default app
