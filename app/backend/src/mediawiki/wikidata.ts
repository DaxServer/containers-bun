import { config } from '@backend/config'
import { buildAuthHeader } from '@backend/core/oauthClient'

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'

export class WikidataClient {
  private accessToken: [string, string]

  constructor(accessToken: [string, string]) {
    this.accessToken = accessToken
  }

  private async getCsrfToken(): Promise<string> {
    const params = { action: 'query', meta: 'tokens', format: 'json' }
    const url = `${WIKIDATA_API}?${new URLSearchParams(params).toString()}`
    const authHeader = buildAuthHeader(
      'GET',
      url,
      config.oauthKey!,
      config.oauthSecret!,
      this.accessToken,
      undefined,
    )
    const res = await fetch(url, {
      headers: { Authorization: authHeader, 'User-Agent': config.userAgent },
    })
    if (!res.ok) throw new Error(`Wikidata CSRF token fetch failed: ${res.status}`)
    const data = (await res.json()) as Record<string, unknown>
    return ((data.query as Record<string, unknown>).tokens as Record<string, string>)
      .csrftoken as string
  }

  async fetchItem(qid: string): Promise<Record<string, unknown>> {
    const params = { action: 'wbgetentities', ids: qid, props: 'claims|sitelinks', format: 'json' }
    const url = `${WIKIDATA_API}?${new URLSearchParams(params).toString()}`
    const authHeader = buildAuthHeader(
      'GET',
      url,
      config.oauthKey!,
      config.oauthSecret!,
      this.accessToken,
      undefined,
    )
    const res = await fetch(url, {
      headers: { Authorization: authHeader, 'User-Agent': config.userAgent },
    })
    if (!res.ok) throw new Error(`Wikidata fetchItem failed: ${res.status}`)
    const data = (await res.json()) as Record<string, unknown>
    return (data.entities as Record<string, unknown>)[qid] as Record<string, unknown>
  }

  async editItem(
    qid: string,
    claims: unknown[] | null,
    sitelinks: Record<string, unknown> | null,
  ): Promise<void> {
    const token = await this.getCsrfToken()
    const payload: Record<string, unknown> = {}
    if (claims !== null) payload.claims = claims
    if (sitelinks !== null) payload.sitelinks = sitelinks

    const queryParams = { action: 'wbeditentity', format: 'json' }
    const url = `${WIKIDATA_API}?${new URLSearchParams(queryParams).toString()}`
    const postData = {
      id: qid,
      data: JSON.stringify(payload),
      token,
    }
    const authHeader = buildAuthHeader(
      'POST',
      url,
      config.oauthKey!,
      config.oauthSecret!,
      this.accessToken,
      postData,
    )
    const body = new URLSearchParams(postData).toString()
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'User-Agent': config.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
    if (!res.ok) throw new Error(`Wikidata editItem failed: ${res.status}`)
  }
}
