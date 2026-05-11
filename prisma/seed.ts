import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const themes = [
    {
      id: 'kinetic-orange',
      name: 'Kinetic Orange',
      thumbnailUrl: '/themes/kinetic-orange.png',
      config: { bg: '#000000', accent: '#FF4D00', fontHeader: 'Archivo Black', fontBody: 'Inter' },
    },
    {
      id: 'midnight-pro',
      name: 'Midnight Pro',
      thumbnailUrl: '/themes/midnight-pro.png',
      config: { bg: '#0a0a14', accent: '#7c3aed', fontHeader: 'Archivo Black', fontBody: 'Inter' },
    },
    {
      id: 'white-label',
      name: 'White Label',
      thumbnailUrl: '/themes/white-label.png',
      config: { bg: '#ffffff', accent: '#000000', fontHeader: 'Archivo Black', fontBody: 'Inter' },
    },
    {
      id: 'steel-blue',
      name: 'Steel Blue',
      thumbnailUrl: '/themes/steel-blue.png',
      config: { bg: '#0f172a', accent: '#3b82f6', fontHeader: 'Archivo Black', fontBody: 'Inter' },
    },
  ]

  for (const theme of themes) {
    await db.theme.upsert({
      where: { id: theme.id },
      create: theme,
      update: { name: theme.name, thumbnailUrl: theme.thumbnailUrl, config: theme.config },
    })
  }
  console.log('✓ Themes seeded')
}

main().catch(console.error).finally(() => db.$disconnect())
