import { ClerkProvider } from '@clerk/nextjs'
import { Archivo_Black, Space_Mono, Inter } from 'next/font/google'
import './globals.css'

const archivo = Archivo_Black({ subsets: ['latin'], variable: '--font-archivo' })
const spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-space-mono' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = { title: 'PITCHER', description: 'Esports Sponsorship OS' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${archivo.variable} ${spaceMono.variable} ${inter.variable}`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
