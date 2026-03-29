import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import Anthropic from "@anthropic-ai/sdk"
import { tavily } from "@tavily/core"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY ?? "" })

type Source = { title: string; url: string; excerpt: string }
type StanceVerdict = {
  speakerId: string
  speakerLabel: string
  claim: string
  verdict: "supported" | "contradicted" | "nuanced" | "unverifiable"
  assessment: string
  sources: Source[]
  isConcreteFact: boolean
}

export async function POST(_req: Request, { params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify the topic belongs to this user
  const topic = await prisma.topic.findFirst({
    where: {
      id: topicId,
      analysis: { recording: { userId: session.user.id } },
    },
    include: {
      stances: { include: { speaker: true } },
    },
  })

  if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (topic.stances.length === 0) return NextResponse.json({ error: "No stances to fact-check" }, { status: 400 })

  // Pass 1 — Claude extracts a specific, searchable claim from each stance
  const stancesText = topic.stances
    .map((s) => `${s.speaker.label}: ${s.stance}`)
    .join("\n")

  let claimsMessage
  try {
    claimsMessage = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Topic: "${topic.title}"
Topic description: ${topic.description}

Each speaker below has stated a position on this topic. Extract the single most specific, factually verifiable claim from each speaker's stance — something that can be searched and fact-checked with real data or research.

Stances:
${stancesText}

Return ONLY a valid JSON array:
[
  { "speakerId": "...", "speakerLabel": "...", "searchQuery": "specific factual claim as a search query" }
]

Rules:
- searchQuery should be concrete and searchable (e.g. "screen time effects on children sleep quality research" not "screens are bad")
- One entry per speaker
- Return ONLY the JSON array`,
      }],
    })
  } catch (err) {
    console.error("Anthropic claims extraction error:", err)
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 })
  }

  const claimsRaw = claimsMessage.content[0]
  if (claimsRaw.type !== "text") return NextResponse.json({ error: "Unexpected response" }, { status: 500 })

  const claimsMatch = claimsRaw.text.match(/\[[\s\S]*\]/)
  if (!claimsMatch) return NextResponse.json({ error: "Could not parse claims" }, { status: 500 })

  const claims = JSON.parse(claimsMatch[0]) as { speakerId: string; speakerLabel: string; searchQuery: string }[]

  // Tavily — search for each claim in parallel
  const searchResults = await Promise.all(
    claims.map(async (c) => {
      try {
        const result = await tavilyClient.search(c.searchQuery, {
          searchDepth: "advanced",
          maxResults: 4,
          includeAnswer: false,
        })
        return { ...c, results: result.results }
      } catch (err) {
        console.error(`Tavily search failed for "${c.searchQuery}":`, err)
        return { ...c, results: [] }
      }
    })
  )

  // Pass 2 — Claude synthesizes per-stance verdicts with citations
  const searchContext = searchResults
    .map((sr) => {
      const sourcesText = sr.results
        .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content?.slice(0, 400) ?? ""}`)
        .join("\n\n")
      return `Speaker: ${sr.speakerLabel}\nClaim: ${sr.searchQuery}\n\nSearch results:\n${sourcesText || "No results found."}`
    })
    .join("\n\n---\n\n")

  let verdictMessage
  try {
    verdictMessage = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `You are a neutral fact-checker. For each speaker below, assess their factual claim against the provided search results.

Topic: "${topic.title}"

${searchContext}

Return ONLY a valid JSON array with one entry per speaker:
[
  {
    "speakerId": "...",
    "speakerLabel": "...",
    "claim": "concise restatement of their claim",
    "verdict": "supported" | "contradicted" | "nuanced" | "unverifiable",
    "isConcreteFact": true | false,
    "assessment": "2-3 sentences: what the evidence says, be direct and specific. Mention source numbers like [1] where relevant.",
    "sources": [
      { "title": "source title", "url": "source url", "excerpt": "most relevant sentence or two from this source" }
    ]
  }
]

Verdict definitions:
- supported: evidence clearly backs the claim
- contradicted: evidence clearly contradicts the claim
- nuanced: evidence partially supports but with important caveats
- unverifiable: insufficient reliable evidence found

isConcreteFact: set to true only if the speaker made a definitive factual assertion (not an opinion, personal preference, or speculative statement). Set to false if the claim is inherently subjective or speculative.

Only include sources that are actually relevant to the verdict. Max 3 sources per stance.
Return ONLY the JSON array.`,
      }],
    })
  } catch (err) {
    console.error("Anthropic verdict error:", err)
    return NextResponse.json({ error: "AI verdict failed" }, { status: 500 })
  }

  const verdictRaw = verdictMessage.content[0]
  if (verdictRaw.type !== "text") return NextResponse.json({ error: "Unexpected response" }, { status: 500 })

  const verdictMatch = verdictRaw.text.match(/\[[\s\S]*\]/)
  if (!verdictMatch) return NextResponse.json({ error: "Could not parse verdicts" }, { status: 500 })

  const stanceVerdicts = JSON.parse(verdictMatch[0]) as StanceVerdict[]

  // Save to DB (upsert so re-checking overwrites)
  await prisma.factCheck.upsert({
    where: { topicId },
    create: { topicId, results: JSON.stringify({ stanceVerdicts }) },
    update: { results: JSON.stringify({ stanceVerdicts }), createdAt: new Date() },
  })

  return NextResponse.json({ stanceVerdicts })
}
