"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  User,
  CheckCircle,
  Circle,
  Target,
  ChevronDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Loader2,
} from "lucide-react"

interface Problem {
  contestId: number
  index: string
  name: string
  rating?: number
  tags: string[]
  url: string
  submissionInfo?: {
    creationTimeSeconds: number
    programmingLanguage: string
    timeConsumedMillis: number
    memoryConsumedBytes: number
    submissionId: number
  }
}

const PROBLEMS_PER_PAGE = 20

// Debounce hook for search
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function JianglyRoadmap() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [userHandle, setUserHandle] = useState("")
  const [savedHandle, setSavedHandle] = useState("")
  const [jianglyProblems, setJianglyProblems] = useState<Problem[]>([])
  const [userSolvedProblems, setUserSolvedProblems] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [userLoading, setUserLoading] = useState(false)
  const [error, setError] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQueries, setSearchQueries] = useState<{ [key: string]: string }>({})
  const [hiddenTags, setHiddenTags] = useState<Set<string>>(new Set())
  const [globalSearch, setGlobalSearch] = useState("")
  const [loadingProgress, setLoadingProgress] = useState(0)

  const debouncedGlobalSearch = useDebounce(globalSearch, 300)

  // Safe localStorage access
  const getStoredHandle = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        return localStorage.getItem("codeforcesHandle") || ""
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error)
    }
    return ""
  }, [])

  const setStoredHandle = useCallback((handle: string) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("codeforcesHandle", handle)
      }
    } catch (error) {
      console.error("Error setting localStorage:", error)
    }
  }, [])

  const removeStoredHandle = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("codeforcesHandle")
      }
    } catch (error) {
      console.error("Error removing from localStorage:", error)
    }
  }, [])

  const fetchJianglyProblems = useCallback(async () => {
    setLoading(true)
    setError("")
    setLoadingProgress(0)

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev < 90) return prev + 10
        return prev
      })
    }, 2000)

    try {
      const response = await fetch("/api/jiangly-problems")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.success && Array.isArray(data.problems)) {
        setJianglyProblems(data.problems)
        setLoadingProgress(100)
        console.log(`Loaded ${data.problems.length} problems from jiangly`)
      } else {
        setError(data.error || "Failed to fetch jiangly's problems")
        setJianglyProblems([])
      }
    } catch (err) {
      console.error("Error fetching jiangly problems:", err)
      setError("Error fetching data. Please try again.")
      setJianglyProblems([])
    } finally {
      clearInterval(progressInterval)
      setLoading(false)
      setLoadingProgress(0)
    }
  }, [])

  const fetchUserSolvedProblems = useCallback(async (handle: string) => {
    if (!handle || !handle.trim()) return

    setUserLoading(true)
    try {
      const response = await fetch(`/api/user-submissions?handle=${encodeURIComponent(handle)}`)
      const data = await response.json()
      if (data.success && Array.isArray(data.solvedProblems)) {
        const solved = new Set(
          data.solvedProblems
            .filter((p: any) => p && p.contestId && p.index)
            .map((p: Problem) => `${p.contestId}${p.index}`),
        )
        setUserSolvedProblems(solved)
        setError("")
      } else {
        setError(`Failed to fetch submissions for ${handle}. Please check if the handle is correct.`)
        setUserSolvedProblems(new Set())
      }
    } catch (err) {
      console.error("Error fetching user submissions:", err)
      setError(`Error fetching submissions for ${handle}. Please try again.`)
      setUserSolvedProblems(new Set())
    } finally {
      setUserLoading(false)
    }
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmedHandle = userHandle.trim()
      if (trimmedHandle) {
        setStoredHandle(trimmedHandle)
        setSavedHandle(trimmedHandle)
        setUserHandle("")
        setError("")

        if (jianglyProblems.length > 0) {
          await fetchUserSolvedProblems(trimmedHandle)
        }
      }
    },
    [userHandle, jianglyProblems.length, fetchUserSolvedProblems, setStoredHandle],
  )

  const clearHandle = useCallback(() => {
    removeStoredHandle()
    setSavedHandle("")
    setUserSolvedProblems(new Set())
  }, [removeStoredHandle])

  const getRatingColor = useCallback((rating?: number) => {
    if (!rating || typeof rating !== "number") return "bg-gray-500 dark:bg-gray-600"
    if (rating < 1200) return "bg-gray-500 dark:bg-gray-600"
    if (rating < 1400) return "bg-green-500 dark:bg-green-600"
    if (rating < 1600) return "bg-cyan-500 dark:bg-cyan-600"
    if (rating < 1900) return "bg-blue-500 dark:bg-blue-600"
    if (rating < 2100) return "bg-violet-500 dark:bg-violet-600"
    if (rating < 2300) return "bg-orange-500 dark:bg-orange-600"
    if (rating < 2400) return "bg-red-500 dark:bg-red-600"
    return "bg-red-600 dark:bg-red-700"
  }, [])

  const { groupedProblems, progress, totalSolved } = useMemo(() => {
    if (!Array.isArray(jianglyProblems) || jianglyProblems.length === 0) {
      return {
        groupedProblems: [],
        progress: 0,
        totalSolved: 0,
      }
    }

    const groups: { [key: string]: Problem[] } = {}

    jianglyProblems.forEach((problem) => {
      if (problem && typeof problem.rating === "number" && problem.contestId && problem.index) {
        const rating = problem.rating
        const key = Math.floor(rating / 100) * 100
        if (!groups[key]) groups[key] = []
        groups[key].push(problem)
      }
    })

    const solvedCount = jianglyProblems.filter(
      (p) => p && p.contestId && p.index && userSolvedProblems.has(`${p.contestId}${p.index}`),
    ).length

    const progressPercent = jianglyProblems.length > 0 ? (solvedCount / jianglyProblems.length) * 100 : 0

    return {
      groupedProblems: Object.entries(groups).sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b)),
      progress: Math.min(100, Math.max(0, progressPercent)),
      totalSolved: solvedCount,
    }
  }, [jianglyProblems, userSolvedProblems])

  const isProblemSolved = useCallback(
    (problem: Problem) => {
      if (!problem || !problem.contestId || !problem.index) return false
      return userSolvedProblems.has(`${problem.contestId}${problem.index}`)
    },
    [userSolvedProblems],
  )

  const toggleGroup = useCallback((rating: string) => {
    setExpandedGroups((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(rating)) {
        newExpanded.delete(rating)
      } else {
        newExpanded.add(rating)
      }
      return newExpanded
    })
  }, [])

  const toggleTags = useCallback((rating: string) => {
    setHiddenTags((prev) => {
      const newHidden = new Set(prev)
      if (newHidden.has(rating)) {
        newHidden.delete(rating)
      } else {
        newHidden.add(rating)
      }
      return newHidden
    })
  }, [])

  const updateSearchQuery = useCallback((rating: string, query: string) => {
    setSearchQueries((prev) => ({
      ...prev,
      [rating]: query,
    }))
  }, [])

  const getFilteredProblems = useCallback(
    (problems: Problem[], rating: string) => {
      if (!Array.isArray(problems)) return []

      const query = searchQueries[rating]?.toLowerCase() || ""
      if (!query) return problems

      return problems.filter((problem) => {
        if (!problem) return false

        const nameMatch = problem.name?.toLowerCase().includes(query) || false
        const idMatch = `${problem.contestId}${problem.index}`.toLowerCase().includes(query)
        const tagMatch =
          Array.isArray(problem.tags) &&
          problem.tags.some((tag) => typeof tag === "string" && tag.toLowerCase().includes(query))

        return nameMatch || idMatch || tagMatch
      })
    },
    [searchQueries],
  )

  const getSubmissionUrl = useCallback((problem: Problem) => {
    if (!problem) return "#"

    if (problem.submissionInfo?.submissionId) {
      return `https://codeforces.com/contest/${problem.contestId}/submission/${problem.submissionInfo.submissionId}`
    }
    return problem.url || `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`
  }, [])

  // Global search filtered problems
  const globalFilteredProblems = useMemo(() => {
    if (!Array.isArray(jianglyProblems)) return []
    if (!debouncedGlobalSearch) return jianglyProblems

    const query = debouncedGlobalSearch.toLowerCase()
    return jianglyProblems.filter((problem) => {
      if (!problem) return false

      const nameMatch = problem.name?.toLowerCase().includes(query) || false
      const idMatch = `${problem.contestId}${problem.index}`.toLowerCase().includes(query)
      const tagMatch =
        Array.isArray(problem.tags) &&
        problem.tags.some((tag) => typeof tag === "string" && tag.toLowerCase().includes(query))

      return nameMatch || idMatch || tagMatch
    })
  }, [jianglyProblems, debouncedGlobalSearch])

  const paginatedProblems = useMemo(() => {
    if (!Array.isArray(globalFilteredProblems)) return []

    const startIndex = (currentPage - 1) * PROBLEMS_PER_PAGE
    const endIndex = startIndex + PROBLEMS_PER_PAGE
    return globalFilteredProblems.slice(startIndex, endIndex)
  }, [globalFilteredProblems, currentPage])

  const totalPages = Math.max(1, Math.ceil(globalFilteredProblems.length / PROBLEMS_PER_PAGE))

  // Mount effect
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load saved handle on mount
  useEffect(() => {
    if (mounted) {
      const saved = getStoredHandle()
      if (saved) {
        setSavedHandle(saved)
      }
    }
  }, [mounted, getStoredHandle])

  // Fetch jiangly problems on mount
  useEffect(() => {
    if (mounted) {
      fetchJianglyProblems()
    }
  }, [mounted, fetchJianglyProblems])

  // Fetch user submissions when handle or problems change
  useEffect(() => {
    if (savedHandle && jianglyProblems.length > 0) {
      fetchUserSolvedProblems(savedHandle)
    }
  }, [savedHandle, jianglyProblems.length, fetchUserSolvedProblems])

  // Set hidden tags when problems load
  useEffect(() => {
    if (Array.isArray(jianglyProblems) && jianglyProblems.length > 0) {
      const ratingGroups = new Set<string>()
      jianglyProblems.forEach((problem) => {
        if (problem && typeof problem.rating === "number") {
          const rating = problem.rating
          const key = Math.floor(rating / 100) * 100
          ratingGroups.add(key.toString())
        }
      })
      setHiddenTags(ratingGroups)
    }
  }, [jianglyProblems])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white transition-colors duration-300">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-6">
            <div></div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="ml-2">{theme === "dark" ? "Light" : "Dark"}</span>
            </Button>
          </div>

          {/* Symm Branding */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="relative">
                <div className="text-3xl font-black tracking-wider bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 dark:from-blue-400 dark:via-purple-400 dark:to-blue-600 bg-clip-text text-transparent">
                  SYMM
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-800/20 dark:from-blue-400/20 dark:via-purple-400/20 dark:to-blue-600/20 blur-sm -z-10 rounded-lg"></div>
              </div>
            </div>
            <div className="w-16 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mx-auto mb-6"></div>
          </div>

          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Jiangly's Problem Roadmap
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Master competitive programming by following jiangly's solved problems
            </p>
          </div>

          {/* Stats */}
          {jianglyProblems.length > 0 && (
            <div className="flex justify-center gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-xl">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Problems</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{jianglyProblems.length}</div>
              </div>
              {savedHandle && (
                <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-xl">
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Your Progress</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalSolved}</div>
                </div>
              )}
            </div>
          )}

          {/* User Handle Input */}
          <Card className="max-w-md mx-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
            <CardContent className="p-6">
              {!savedHandle ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Codeforces Username"
                    value={userHandle}
                    onChange={(e) => setUserHandle(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    disabled={userLoading}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 transition-all duration-200 transform hover:scale-105"
                    disabled={userLoading || !userHandle.trim()}
                  >
                    {userLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">{savedHandle}</span>
                  </div>
                  {userLoading ? (
                    <div className="text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                    </div>
                  ) : (
                    <>
                      <Progress value={progress} className="w-full h-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {Math.round(progress)}% completed ({totalSolved} / {jianglyProblems.length})
                      </p>
                    </>
                  )}
                  <Button
                    onClick={clearHandle}
                    variant="outline"
                    size="sm"
                    className="w-full border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 bg-transparent"
                    disabled={userLoading}
                  >
                    Change Handle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
            <p className="mt-4 text-gray-900 dark:text-white font-medium">Loading jiangly's problems...</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Fetching data from Codeforces API...</p>
            {loadingProgress > 0 && (
              <div className="mt-4 max-w-md mx-auto">
                <Progress value={loadingProgress} className="w-full h-2" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{loadingProgress}% complete</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl p-6 max-w-md mx-auto">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button
                onClick={fetchJianglyProblems}
                className="bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
                size="sm"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Problems Display */}
        {!loading && !error && jianglyProblems.length > 0 && (
          <Tabs defaultValue="roadmap" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
              <TabsTrigger
                value="roadmap"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-200"
              >
                Roadmap
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-200"
              >
                All Problems
              </TabsTrigger>
            </TabsList>

            <TabsContent value="roadmap" className="space-y-6 mt-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Rating-Based Roadmap</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Click on rating groups to expand • {jianglyProblems.length} total problems
                </p>
              </div>

              {groupedProblems.map(([rating, problems]) => {
                if (!Array.isArray(problems)) return null

                const isExpanded = expandedGroups.has(rating)
                const solvedInGroup = problems.filter((p) => isProblemSolved(p)).length
                const filteredProblems = getFilteredProblems(problems, rating)
                const tagsHidden = hiddenTags.has(rating)

                return (
                  <Card
                    key={rating}
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <CardHeader
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 py-4 rounded-t-lg"
                      onClick={() => toggleGroup(rating)}
                    >
                      <CardTitle className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-gray-900 dark:text-white font-semibold">
                            Rating {rating} ({problems.length} problems)
                          </span>
                          <Badge
                            className={`${getRatingColor(Number.parseInt(rating))} text-white text-xs font-medium`}
                          >
                            {rating}
                          </Badge>
                          {savedHandle && (
                            <Badge
                              variant="outline"
                              className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-400 text-xs"
                            >
                              {solvedInGroup}/{problems.length} solved
                            </Badge>
                          )}
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </CardTitle>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0 pb-6">
                        {/* Search and Controls */}
                        <div className="flex gap-3 mb-6">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                              placeholder="Search problems in this rating..."
                              value={searchQueries[rating] || ""}
                              onChange={(e) => updateSearchQuery(rating, e.target.value)}
                              className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleTags(rating)}
                            className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                          >
                            {tagsHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            <span className="ml-2">{tagsHidden ? "Show" : "Hide"} Tags</span>
                          </Button>
                        </div>

                        {/* Problems List */}
                        <div className="space-y-3">
                          {filteredProblems.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              No problems found matching your search.
                            </div>
                          ) : (
                            filteredProblems.slice(0, 120).map((problem, index) => {
                              if (!problem || !problem.contestId || !problem.index) return null

                              return (
                                <div
                                  key={`${problem.contestId}${problem.index}`}
                                  className={`flex items-center justify-between p-4 rounded-lg border text-sm transition-all duration-200 hover:shadow-md ${
                                    isProblemSolved(problem)
                                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/50"
                                      : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded min-w-[2rem] text-center">
                                        {index + 1}
                                      </span>
                                      {isProblemSolved(problem) ? (
                                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <a
                                        href={getSubmissionUrl(problem)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 block truncate font-medium"
                                      >
                                        {problem.contestId}
                                        {problem.index}. {problem.name || "Unknown Problem"}
                                      </a>
                                      {!tagsHidden && Array.isArray(problem.tags) && (
                                        <div className="flex gap-1 mt-2">
                                          {problem.tags.slice(0, 2).map((tag, index) => (
                                            <Badge
                                              key={`${tag}-${index}`}
                                              variant="secondary"
                                              className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                                            >
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {problem.rating && (
                                      <Badge
                                        className={`${getRatingColor(problem.rating)} text-white text-xs font-medium`}
                                      >
                                        {problem.rating}
                                      </Badge>
                                    )}
                                    {problem.submissionInfo && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs px-3 py-1 transition-all duration-200"
                                        onClick={() => window.open(getSubmissionUrl(problem), "_blank")}
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          )}
                          {filteredProblems.length > 120 && (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                              Showing first 120 problems. Use search to find specific problems.
                            </div>
                          )}
                        </div>

                        {/* Search Results Info */}
                        {searchQueries[rating] && (
                          <div className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                            Showing {Math.min(filteredProblems.length, 120)} of {filteredProblems.length} problems
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </TabsContent>

            <TabsContent value="all" className="space-y-6 mt-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">All Problems</h2>

                {/* Global Search */}
                <div className="max-w-md mx-auto mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search all problems..."
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                      className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages} ({globalFilteredProblems.length} total problems)
                </p>
              </div>

              <div className="space-y-3">
                {paginatedProblems.map((problem, index) => {
                  if (!problem || !problem.contestId || !problem.index) return null

                  const globalIndex = (currentPage - 1) * PROBLEMS_PER_PAGE + index + 1

                  return (
                    <div
                      key={`${problem.contestId}${problem.index}`}
                      className={`flex items-center justify-between p-4 rounded-lg border text-sm transition-all duration-200 hover:shadow-md ${
                        isProblemSolved(problem)
                          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/50"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded min-w-[2.5rem] text-center">
                            {globalIndex}
                          </span>
                          {isProblemSolved(problem) ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <a
                            href={getSubmissionUrl(problem)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 block truncate font-medium"
                          >
                            {problem.contestId}
                            {problem.index}. {problem.name || "Unknown Problem"}
                          </a>
                          {Array.isArray(problem.tags) && (
                            <div className="flex gap-1 mt-2">
                              {problem.tags.slice(0, 3).map((tag, index) => (
                                <Badge
                                  key={`${tag}-${index}`}
                                  variant="secondary"
                                  className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {problem.rating && (
                          <Badge className={`${getRatingColor(problem.rating)} text-white text-xs font-medium`}>
                            {problem.rating}
                          </Badge>
                        )}
                        {problem.submissionInfo && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs px-3 py-1 transition-all duration-200"
                            onClick={() => window.open(getSubmissionUrl(problem), "_blank")}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 px-4">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Footer */}
        <footer className="text-center mt-16 py-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            Made with <span className="text-red-500">❤️</span> by Symmetry
          </p>
        </footer>
      </div>
    </div>
  )
}
