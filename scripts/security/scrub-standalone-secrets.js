#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..', '..')
const artifactRoots = ['.next/standalone', 'release-artifact/.next/standalone']
const sensitiveEnvNames = new Set(['.env'])

function isEnvVariant(fileName) {
  return fileName === '.env' || fileName.startsWith('.env.')
}

function removeFile(filePath) {
  try {
    fs.unlinkSync(filePath)
    console.log(`[security] removed secret-bearing build file: ${path.relative(projectRoot, filePath)}`)
  } catch (error) {
    if (error && error.code === 'ENOENT') return
    throw error
  }
}

function walkAndScrub(root) {
  if (!fs.existsSync(root)) return

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      walkAndScrub(fullPath)
      continue
    }

    if (entry.isFile() && (sensitiveEnvNames.has(entry.name) || isEnvVariant(entry.name))) {
      removeFile(fullPath)
    }
  }
}

for (const relativeRoot of artifactRoots) {
  walkAndScrub(path.join(projectRoot, relativeRoot))
}
