import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Lambda — The Superintelligence Cloud",
  description: "Supercomputers for training and inference",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
