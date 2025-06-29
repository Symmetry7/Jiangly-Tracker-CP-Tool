import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Jiangly's Problem Roadmap",
  description: "Master competitive programming by following jiangly's solved problems",
  icons: {
    icon: [
      {
        url: "https://assets.vercel.com/image/upload/front/favicon/vercel/favicon.ico",
        sizes: "any",
      },
      {
        url: "https://assets.vercel.com/image/upload/front/favicon/vercel/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "https://assets.vercel.com/image/upload/front/favicon/vercel/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="https://assets.vercel.com/image/upload/front/favicon/vercel/favicon.ico" sizes="any" />
        <link
          rel="icon"
          href="https://assets.vercel.com/image/upload/front/favicon/vercel/icon.svg"
          type="image/svg+xml"
        />
        <link
          rel="apple-touch-icon"
          href="https://assets.vercel.com/image/upload/front/favicon/vercel/apple-touch-icon.png"
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <div className="error-boundary">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  )
}
