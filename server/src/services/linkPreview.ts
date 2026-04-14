// eslint-disable-next-line @typescript-eslint/no-require-imports
const ogs = require('open-graph-scraper')

export interface LinkPreviewResult {
  url: string
  title: string
  description: string
  imageUrl: string
  siteName: string
}

const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g

export function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) || []
}

export async function fetchLinkPreview(url: string): Promise<LinkPreviewResult | null> {
  try {
    const { result } = await ogs({
      url,
      timeout: 5000,
      fetchOptions: {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; MIRABot/1.0)',
        },
      },
    })

    return {
      url,
      title: result.ogTitle || result.dcTitle || '',
      description: result.ogDescription || result.dcDescription || '',
      imageUrl: result.ogImage?.[0]?.url || '',
      siteName: result.ogSiteName || new URL(url).hostname,
    }
  } catch {
    return null
  }
}
