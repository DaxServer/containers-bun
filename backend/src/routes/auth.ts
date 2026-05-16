import { config } from '@backend/config'
import { createOAuthClient } from '@backend/core/oauthClient'
import { createSessionPlugin } from '@backend/core/session'
import { Elysia } from 'elysia'

const MIN_EDITCOUNT = 50

// Noop store — used only for TypeScript context inference; deduped at runtime
// by the real Redis-backed plugin (same name: 'session') in the parent app.
const _noopStore = {
  async get(_k: string): Promise<null> {
    return null
  },
  async set(_k: string, _v: string, _ex: 'EX', _ttl: number): Promise<void> {},
  async del(_k: string): Promise<void> {},
}
const _sessionRef = createSessionPlugin(_noopStore)

export const createAuthRoutes = (
  oauthClient = createOAuthClient(config.oauthKey, config.oauthSecret),
) =>
  new Elysia({ prefix: '/auth' })
    .use(_sessionRef)
    .get('/login', async ({ session, redirect }) => {
      const { redirectUrl, requestToken } = await oauthClient.initiate()
      session.request_token = requestToken
      await session.save()

      return redirect(redirectUrl, 302)
    })
    .get('/callback', async ({ session, query, redirect, set }) => {
      if (!session.request_token) {
        set.status = 400
        return 'No request token in session'
      }
      if (!query.oauth_token || !query.oauth_verifier) {
        set.status = 400
        return 'Missing required OAuth parameters'
      }

      const { accessToken } = await oauthClient.complete(
        session.request_token,
        new URLSearchParams(query as Record<string, string>).toString(),
      )
      const identity = await oauthClient.identify(accessToken)

      if (identity.editcount < MIN_EDITCOUNT || !identity.rights.includes('autoconfirmed')) {
        set.status = 403
        return 'You must be an autoconfirmed Commons user with at least 50 edits to use this tool.'
      }

      session.user = {
        username: identity.username,
        sub: identity.sub,
        editcount: identity.editcount,
        rights: identity.rights,
      }
      session.access_token = accessToken
      delete session.request_token
      await session.save()

      return redirect('/', 302)
    })
    .get('/logout', async ({ session, redirect }) => {
      session.clear()
      await session.save()
      return redirect('/', 302)
    })
    .get('/whoami', ({ session, set }) => {
      if (!session.user) {
        set.status = 401
        return { message: 'Unauthorized' }
      }
      return {
        username: session.user.username,
        userid: session.user.sub,
        authorized: config.xUsername === session.user.username,
      }
    })
    .post('/register', async ({ session, headers, set }) => {
      // Read live from env so tests can inject values via process.env
      const xUsername = Bun.env.X_USERNAME ?? ''
      const xApiKey = Bun.env.X_API_KEY ?? ''
      if (!xUsername || !xApiKey) {
        set.status = 500
        return {
          message: 'Server configuration error: API key or username not set',
        }
      }

      const providedKey = headers['x-api-key']
      if (!providedKey) {
        set.status = 400
        return { message: 'Missing X-API-KEY header' }
      }

      if (providedKey !== xApiKey) {
        set.status = 401
        return { message: 'Invalid API key' }
      }

      session.user = {
        username: xUsername,
        sub: 'bot-user-id',
        editcount: 0,
        rights: [],
      }
      session.access_token = ['test-key', 'test-secret']
      await session.save()

      return { message: 'User registered successfully', username: xUsername }
    })

export const authRoutes = createAuthRoutes()
