import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM users').all()
    return c.json(results)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.post('/users', async (c) => {
  try {
    const { name, email } = await c.req.json()
    if (!name || !email) {
      return c.json({ error: 'Name and email are required' }, 400)
    }
    
    const { success } = await c.env.DB.prepare(
      'INSERT INTO users (name, email) VALUES (?, ?)'
    )
    .bind(name, email)
    .run()

    if (success) {
      return c.json({ message: 'User created' }, 201)
    } else {
      return c.json({ error: 'Failed to create user' }, 500)
    }
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default app
