import app from './app'
const port = process.env.PORT || 3001
app.listen(port, () => console.log(`API disponível na porta ${port}`))
export default app
