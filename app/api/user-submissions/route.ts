import { type NextRequest, NextResponse } from "next/server"

interface CodeforcesSubmission {
  id: number
  contestId: number
  creationTimeSeconds: number
  relativeTimeSeconds: number
  problem: {
    contestId: number
    index: string
    name: string
    type: string
    rating?: number
    tags: string[]
  }
  author: {
    members: Array<{ handle: string }>
  }
  programmingLanguage: string
  verdict: string
  testset: string
  passedTestCount: number
  timeConsumedMillis: number
  memoryConsumedBytes: number
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const handle = searchParams.get("handle")

  if (!handle) {
    return NextResponse.json({ success: false, error: "Handle is required" }, { status: 400 })
  }

  // Validate handle format (basic validation)
  if (!/^[a-zA-Z0-9_.-]+$/.test(handle) || handle.length > 24) {
    return NextResponse.json({ success: false, error: "Invalid handle format" }, { status: 400 })
  }

  try {
    // Fetch user's submissions with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=5000`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 400) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
      }
      throw new Error("Failed to fetch from Codeforces API")
    }

    const data = await response.json()

    if (data.status !== "OK") {
      if (data.comment && data.comment.includes("not found")) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
      }
      throw new Error(data.comment || "Codeforces API returned error")
    }

    // Filter for accepted submissions
    const acceptedSubmissions = data.result.filter((submission: CodeforcesSubmission) => submission.verdict === "OK")

    // Get unique solved problems
    const solvedProblems = new Map()
    acceptedSubmissions.forEach((submission: CodeforcesSubmission) => {
      const key = `${submission.problem.contestId}${submission.problem.index}`
      if (!solvedProblems.has(key)) {
        solvedProblems.set(key, {
          contestId: submission.problem.contestId,
          index: submission.problem.index,
          name: submission.problem.name,
          rating: submission.problem.rating,
          tags: submission.problem.tags,
        })
      }
    })

    return NextResponse.json({
      success: true,
      solvedProblems: Array.from(solvedProblems.values()),
      count: solvedProblems.size,
    })
  } catch (error) {
    console.error("Error fetching user submissions:", error)

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ success: false, error: "Request timeout. Please try again." }, { status: 408 })
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user submissions. Please check the handle and try again.",
      },
      { status: 500 },
    )
  }
}
