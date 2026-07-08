import express from 'express'
import axios from 'axios'
import dotenv from 'dotenv'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
if (fs.existsSync(join(__dirname, '.env'))) dotenv.config({ path: join(__dirname, '.env') })

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: Date.now() }))

let accessToken = null
let tokenExpiry = 0

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken
  const { data } = await axios.post(
    'https://aip.baidubce.com/oauth/2.0/token', null,
    { params: { grant_type: 'client_credentials', client_id: process.env.BAIDU_API_KEY, client_secret: process.env.BAIDU_SECRET_KEY }, timeout: 10000 }
  )
  accessToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return accessToken
}

app.post('/api/remove-bg', async (req, res) => {
  try {
    const { image } = req.body
    if (!image) return res.status(400).json({ error: 'No image' })
    const token = await getAccessToken()
    const base64 = image.replace(/^data:image\/\w+;base64,/, '')
    const params = new URLSearchParams({ access_token: token, image: base64 })
    const { data } = await axios.post(
      'https://aip.baidubce.com/rest/2.0/image-classify/v1/body_seg',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 60000 }
    )
    if (data.error_code) return res.status(400).json({ error: data.error_msg + ' (code:' + data.error_code + ')' })
    res.json({ foreground: 'data:image/png;base64,' + data.foreground })
  } catch (e) {
    console.error(e.message)
    res.status(500).json({ error: e.response?.data?.error_msg || e.message })
  }
})

// Serve built frontend in production
const distPath = join(__dirname, 'dist')
app.use(express.static(distPath))
app.get('*', (_, res) => res.sendFile(join(distPath, 'index.html')))

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`))
