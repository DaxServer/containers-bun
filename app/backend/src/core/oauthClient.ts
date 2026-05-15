import { createHmac, timingSafeEqual } from 'node:crypto'

const INDEX_URL = 'https://commons.wikimedia.org/w/index.php'

export type OAuthIdentity = {
  username: string
  sub: string
  editcount: number
  rights: string[]
}

export type OAuthClient = {
  initiate(): Promise<{ redirectUrl: string; requestToken: [string, string] }>
  complete(
    requestToken: [string, string],
    queryString: string,
  ): Promise<{ accessToken: [string, string] }>
  identify(accessToken: [string, string]): Promise<OAuthIdentity>
}

export function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

export function buildParamString(params: Record<string, string>): string {
  return Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join('&')
}

export function sign(baseString: string, key: string): string {
  const hasher = new Bun.CryptoHasher('sha1', key)
  hasher.update(baseString)
  return hasher.digest('base64') as string
}

function buildSignatureBaseString(
  method: string,
  url: string,
  params: Record<string, string>,
): string {
  const urlObj = new URL(url)
  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
  const queryParams = Object.fromEntries(urlObj.searchParams)
  return [
    method.toUpperCase(),
    percentEncode(baseUrl),
    percentEncode(buildParamString({ ...queryParams, ...params })),
  ].join('&')
}

function buildAuthHeader(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  token?: [string, string],
  extraParams?: Record<string, string>,
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
    ...(token ? { oauth_token: token[0] } : {}),
    ...extraParams,
  }

  const signingKey = `${percentEncode(consumerSecret)}&${token ? percentEncode(token[1]) : ''}`
  const signature = sign(buildSignatureBaseString(method, url, oauthParams), signingKey)

  return `OAuth ${Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${k}="${percentEncode(v)}"`)
    .join(', ')}`
}

function parseOAuthResponse(body: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(body))
}

function verifyAndDecodeJwt(jwt: string, secret: string): Record<string, unknown> {
  const parts = jwt.split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT')
  const [header, payload, signature] = parts as [string, string, string]
  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw new Error('JWT signature verification failed')
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
}

export function createOAuthClient(
  consumerKey: string,
  consumerSecret: string,
  fetchImpl: typeof fetch = fetch,
): OAuthClient {
  return {
    async initiate() {
      const url = `${INDEX_URL}?title=Special:OAuth/initiate`
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: buildAuthHeader('POST', url, consumerKey, consumerSecret, undefined, {
            oauth_callback: 'oob',
          }),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: '',
      })
      const text = await res.text()
      if (!res.ok) throw new Error(`OAuth initiate failed: ${res.status} — ${text}`)
      const params = parseOAuthResponse(text)
      if (!params.oauth_token || !params.oauth_token_secret)
        throw new Error(`OAuth initiate: no token in response — ${text}`)
      const requestToken: [string, string] = [params.oauth_token, params.oauth_token_secret]
      return {
        requestToken,
        redirectUrl: `${INDEX_URL}?title=Special:OAuth/authenticate&oauth_token=${params.oauth_token}&oauth_consumer_key=${consumerKey}`,
      }
    },

    async complete(requestToken, queryString) {
      const params = Object.fromEntries(new URLSearchParams(queryString))
      const verifier = params.oauth_verifier ?? ''
      const url = `${INDEX_URL}?title=Special:OAuth/token`
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: buildAuthHeader('POST', url, consumerKey, consumerSecret, requestToken, {
            oauth_verifier: verifier,
          }),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `oauth_verifier=${encodeURIComponent(verifier)}`,
      })
      if (!res.ok) throw new Error(`OAuth token exchange failed: ${res.status}`)
      const p = parseOAuthResponse(await res.text())
      if (!p.oauth_token || !p.oauth_token_secret)
        throw new Error('OAuth token exchange failed: missing tokens in response')
      return { accessToken: [p.oauth_token, p.oauth_token_secret] as [string, string] }
    },

    async identify(accessToken) {
      const url = `${INDEX_URL}?title=Special:OAuth/identify`
      const res = await fetchImpl(url, {
        headers: {
          Authorization: buildAuthHeader('GET', url, consumerKey, consumerSecret, accessToken),
        },
      })
      if (!res.ok) throw new Error(`OAuth identify failed: ${res.status}`)
      const payload = verifyAndDecodeJwt(await res.text(), consumerSecret)
      return {
        username: payload.username as string,
        sub: String(payload.sub),
        editcount: payload.editcount as number,
        rights: payload.rights as string[],
      }
    },
  }
}
