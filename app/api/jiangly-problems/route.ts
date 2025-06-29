import { NextResponse } from "next/server"

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

async function fetchAllSubmissions(handle: string): Promise<CodeforcesSubmission[]> {
  const allSubmissions: CodeforcesSubmission[] = []
  let from = 1
  const maxCount = 5000 // Increased to get more submissions

  try {
    // Fetch more batches to get ALL submissions
    for (let batch = 0; batch < 10; batch++) {
      // Increased from 3 to 10 batches
      console.log(`Fetching batch ${batch + 1}, submissions from ${from}`)

      const response = await fetch(
        `https://codeforces.com/api/user.status?handle=${handle}&from=${from}&count=${maxCount}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; JianglyRoadmap/1.0)",
          },
        },
      )

      if (!response.ok) {
        console.error(`HTTP error: ${response.status}`)
        break
      }

      const data = await response.json()

      if (data.status !== "OK") {
        console.error(`API error: ${data.comment}`)
        break
      }

      const submissions = data.result
      if (!submissions || submissions.length === 0) {
        console.log("No more submissions found")
        break
      }

      allSubmissions.push(...submissions)
      console.log(`Added ${submissions.length} submissions, total: ${allSubmissions.length}`)

      // If we got fewer submissions than requested, we've reached the end
      if (submissions.length < maxCount) {
        console.log(`Got ${submissions.length} submissions, reached end`)
        break
      }

      from += maxCount

      // Very short delay for faster loading
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  } catch (error) {
    console.error("Error fetching submissions:", error)
  }

  console.log(`Total submissions fetched: ${allSubmissions.length}`)
  return allSubmissions
}

export async function GET() {
  try {
    console.log("Starting to fetch jiangly's submissions...")

    // Fetch ALL submissions
    const allSubmissions = await fetchAllSubmissions("jiangly")

    if (!allSubmissions || allSubmissions.length === 0) {
      throw new Error("No submissions found")
    }

    console.log(`Processing ${allSubmissions.length} total submissions...`)

    // Filter for accepted submissions with ratings - INCLUDE 800 rating problems
    const acceptedSubmissions = allSubmissions.filter(
      (submission: CodeforcesSubmission) =>
        submission &&
        submission.verdict === "OK" &&
        submission.problem &&
        submission.problem.rating &&
        submission.problem.rating >= 800,
    )

    console.log(`Found ${acceptedSubmissions.length} accepted submissions with ratings`)

    // Remove duplicates and keep the first (most recent) submission for each problem
    const uniqueProblems = new Map()

    acceptedSubmissions.forEach((submission: CodeforcesSubmission) => {
      if (!submission || !submission.problem) return

      const key = `${submission.problem.contestId}${submission.problem.index}`
      if (!uniqueProblems.has(key)) {
        uniqueProblems.set(key, {
          contestId: submission.problem.contestId,
          index: submission.problem.index,
          name: submission.problem.name || "Unknown Problem",
          rating: submission.problem.rating,
          tags: submission.problem.tags || [],
          url: `https://codeforces.com/problemset/problem/${submission.problem.contestId}/${submission.problem.index}`,
          submissionInfo: {
            creationTimeSeconds: submission.creationTimeSeconds,
            programmingLanguage: submission.programmingLanguage,
            timeConsumedMillis: submission.timeConsumedMillis,
            memoryConsumedBytes: submission.memoryConsumedBytes,
            submissionId: submission.id,
          },
        })
      }
    })

    const problems = Array.from(uniqueProblems.values())
      .filter((p) => p && p.rating) // Ensure valid problems
      .sort((a, b) => (a.rating || 0) - (b.rating || 0))

    // Log problem counts by rating for debugging
    const ratingCounts: { [key: string]: number } = {}
    problems.forEach((problem) => {
      const rating = Math.floor((problem.rating || 0) / 100) * 100
      ratingCounts[rating] = (ratingCounts[rating] || 0) + 1
    })

    console.log("Problem counts by rating:", ratingCounts)
    console.log(`Returning ${problems.length} unique problems`)

    return NextResponse.json({
      success: true,
      problems: problems,
      count: problems.length,
      totalSubmissions: allSubmissions.length,
      ratingCounts: ratingCounts, // Include for debugging
    })
  } catch (error) {
    console.error("Error fetching jiangly problems:", error)
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch problems: ${error instanceof Error ? error.message : "Unknown error"}`,
        problems: [], // Always return an array
        count: 0,
      },
      { status: 500 },
    )
  }
}
