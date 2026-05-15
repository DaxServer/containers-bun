import { config } from '@backend/config'
import { buildAuthHeader } from '@backend/core/oauthClient'

export class MediaWikiClient {
  private accessToken: [string, string]

  constructor(accessToken: [string, string]) {
    this.accessToken = accessToken
  }

  private async apiRequest(
    params: Record<string, string>,
    method = 'GET',
    postData?: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const baseParams = { format: 'json', formatversion: '2', ...params }
    const url = `${config.wikimediaUrls.baseUrl}?${new URLSearchParams(baseParams).toString()}`
    const authHeader = buildAuthHeader(
      method,
      url,
      config.oauthKey!,
      config.oauthSecret!,
      this.accessToken,
      method === 'POST' ? postData : undefined,
    )
    const headers: Record<string, string> = {
      Authorization: authHeader,
      'User-Agent': config.userAgent,
    }
    let body: BodyInit | undefined
    if (method === 'POST' && postData) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      body = new URLSearchParams(postData).toString()
    }
    const res = await fetch(url, { method, headers, body })
    if (!res.ok) throw new Error(`MediaWiki API request failed: ${res.status}`)
    return res.json() as Promise<Record<string, unknown>>
  }

  private async getCsrfToken(): Promise<string> {
    const result = await this.apiRequest({ action: 'query', meta: 'tokens' })
    return ((result.query as Record<string, unknown>).tokens as Record<string, string>)
      .csrftoken as string
  }

  async createPage(title: string, text: string): Promise<string> {
    const token = await this.getCsrfToken()
    const result = await this.apiRequest({ action: 'edit' }, 'POST', {
      title,
      text,
      createonly: '1',
      token,
    })
    if (result.error) {
      if ((result.error as Record<string, string>).code === 'articleexists') return title
      throw new Error((result.error as Record<string, string>).info ?? 'Edit failed')
    }
    return (result.edit as Record<string, string>).title as string
  }

  async isCategoryDeleted(title: string): Promise<boolean> {
    const result = await this.apiRequest({
      action: 'query',
      list: 'logevents',
      letype: 'delete',
      letitle: `Category:${title}`,
    })
    const logevents = ((result.query as Record<string, unknown>).logevents as unknown[]) ?? []
    return logevents.length > 0
  }

  async getCategoryMembers(category: string): Promise<string[]> {
    const baseParams: Record<string, string> = {
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmtype: 'file',
      cmlimit: '500',
    }
    const titles: string[] = []
    let params = { ...baseParams }
    while (true) {
      const result = await this.apiRequest(params)
      if (result.error)
        throw new Error(
          (result.error as Record<string, string>).info ?? 'Failed to fetch category members',
        )
      const members =
        ((result.query as Record<string, unknown>).categorymembers as Array<
          Record<string, string>
        >) ?? []
      for (const m of members) titles.push(m.title!)
      if (!result.continue) break
      params = {
        ...baseParams,
        cmcontinue: (result.continue as Record<string, string>).cmcontinue as string,
      }
    }
    return titles
  }

  async replaceCategoryInPage(title: string, source: string, target: string): Promise<boolean> {
    const result = await this.apiRequest({
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: title,
    })
    if (result.error) return false
    const pages = (result.query as Record<string, unknown>).pages as Record<string, unknown>
    const page = Object.values(pages)[0] as Record<string, unknown>
    const revisions = (page.revisions as Array<Record<string, unknown>>) ?? []
    const slots = (revisions[0]?.slots as Record<string, unknown>) ?? {}
    const mainSlot = (slots.main as Record<string, unknown>) ?? {}
    // formatversion=2 uses .content
    const wikitext = (mainSlot.content as string) ?? ''

    const sourceNormalized = source.replace(/_/g, ' ')
    const targetNormalized = target.replace(/_/g, ' ')
    const sourceWords = sourceNormalized
      .split(' ')
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const sourceRegex = sourceWords.join('(?:_| )')
    const pattern = new RegExp(`\\[\\[Category:${sourceRegex}(\\|[^\\]]+)?\\]\\]`, 'gi')

    if (!pattern.test(wikitext)) return false
    pattern.lastIndex = 0
    const newText = wikitext.replace(
      pattern,
      (_match, alias) => `[[Category:${targetNormalized}${alias ?? ''}]]`,
    )

    const token = await this.getCsrfToken()
    const editResult = await this.apiRequest({ action: 'edit' }, 'POST', {
      title,
      text: newText,
      summary: `Recategorize: [[Category:${sourceNormalized}]] → [[Category:${targetNormalized}]]`,
      token,
    })
    if (editResult.error) return false
    return true
  }
}
