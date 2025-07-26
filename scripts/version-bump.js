#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Version bump script for semantic versioning
 * Usage: node scripts/version-bump.js [major|minor|patch]
 */

function bumpVersion(type = 'patch') {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
  
  // Read current package.json
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const currentVersion = packageJson.version;
  
  // Parse version
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  console.log(`Bumping version from ${currentVersion} to ${newVersion}`);
  
  // Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  
  // Update manifest.json if it exists
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = newVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log('Updated manifest.json version');
  }
  
  console.log(`Version bumped to ${newVersion}`);
  
  // Update CHANGELOG.md
  updateChangelog(newVersion);
  
  return newVersion;
}

function updateChangelog(version) {
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
  
  if (!fs.existsSync(changelogPath)) {
    console.log('CHANGELOG.md not found, skipping changelog update');
    return;
  }
  
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const date = new Date().toISOString().split('T')[0];
  
  const newEntry = `## [${version}] - ${date}

### Added
- 

### Changed
- 

### Fixed
- 

### Removed
- 

`;
  
  // Insert new entry after the first line (usually the title)
  const lines = changelog.split('\n');
  const titleIndex = lines.findIndex(line => line.startsWith('# '));
  
  if (titleIndex !== -1) {
    lines.splice(titleIndex + 1, 0, '', newEntry);
    fs.writeFileSync(changelogPath, lines.join('\n'));
    console.log('Added new entry to CHANGELOG.md');
  }
}

// Main execution
const type = process.argv[2] || 'patch';

if (!['major', 'minor', 'patch'].includes(type)) {
  console.error('Usage: node scripts/version-bump.js [major|minor|patch]');
  process.exit(1);
}

bumpVersion(type); 