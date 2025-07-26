# Semantic Versioning Guide for PushBridge

This document outlines the semantic versioning strategy for PushBridge, a Chrome extension that provides Pushbullet functionality.

## Version Format

We follow [Semantic Versioning 2.0.0](https://semver.org/) with the format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Incompatible API changes or significant breaking changes
- **MINOR**: New functionality in a backward-compatible manner
- **PATCH**: Backward-compatible bug fixes

## Versioning Strategies

### 1. **Manual Versioning (Current Implementation)**

Use the provided scripts to manually bump versions:

```bash
# Patch version (1.0.0 → 1.0.1) - Bug fixes
npm run version:patch

# Minor version (1.0.0 → 1.1.0) - New features
npm run version:minor

# Major version (1.0.0 → 2.0.0) - Breaking changes
npm run version:major
```

### 2. **Conventional Commits + Automated Versioning**

#### Setup Steps:

1. Install semantic-release packages:

```bash
npm install --save-dev semantic-release @semantic-release/changelog @semantic-release/git
```

2. Add to package.json:

```json
{
  "scripts": {
    "semantic-release": "semantic-release"
  },
  "release": {
    "branches": ["main"],
    "plugins": [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      "@semantic-release/changelog",
      "@semantic-release/npm",
      "@semantic-release/git",
      "@semantic-release/github"
    ]
  }
}
```

#### Commit Message Format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types that trigger releases:**

- `feat:` → Minor version bump
- `fix:` → Patch version bump
- `BREAKING CHANGE:` in footer → Major version bump

**Examples:**

```bash
git commit -m "feat(popup): add dark mode toggle"
git commit -m "fix(background): resolve notification badge count issue"
git commit -m "feat(sms): add message threading

BREAKING CHANGE: SMS API interface has changed"
```

### 3. **Hybrid Approach (Recommended)**

Combine manual control with automation:

1. Use conventional commits for automatic patch/minor releases
2. Manual major version bumps for breaking changes
3. Feature branches for development
4. Release branches for release preparation

## Release Workflow

### Current CI/CD Process

1. **Development**: Work on feature branches
2. **Testing**: Create PR to `main` - runs tests and linting
3. **Release**: Push to `main` triggers:
   - Build with Node.js 24
   - Run production build
   - Package extension into ZIP
   - Create GitHub release with version tag
   - Upload ZIP as release asset

### Release Checklist

Before pushing to main:

- [ ] Update CHANGELOG.md with new features/fixes
- [ ] Bump version using `npm run version:*` scripts
- [ ] Test extension locally
- [ ] Ensure all tests pass
- [ ] Update README if needed

## Version Numbering Guidelines

### For Chrome Extensions:

#### MAJOR (X.0.0)

- Complete UI/UX redesign
- Breaking changes to storage format
- Manifest version updates (V2 → V3)
- Complete API overhaul
- Removal of major features

#### MINOR (0.X.0)

- New features (SMS sync, file sharing, etc.)
- New popup components
- Additional notification types
- New settings/options
- Performance improvements
- New integrations

#### PATCH (0.0.X)

- Bug fixes
- Security patches
- Minor UI adjustments
- Performance optimizations
- Documentation updates
- Dependency updates (non-breaking)

## Chrome Web Store Considerations

### Version Requirements:

- Chrome Web Store requires version numbers
- Maximum 4 dot-separated integers (e.g., 1.2.3.4)
- Each integer must be 0-65535
- No leading zeros (except for 0 itself)

### Publishing Strategy:

1. **Development versions**: Use patch increments (1.0.1, 1.0.2)
2. **Feature releases**: Use minor increments (1.1.0, 1.2.0)
3. **Major releases**: Use major increments (2.0.0, 3.0.0)

## Automation Options

### Option 1: GitHub Actions with semantic-release

```yaml
- name: Semantic Release
  uses: cycjimmy/semantic-release-action@v3
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Option 2: Release Please

```yaml
- uses: google-github-actions/release-please-action@v3
  with:
    release-type: node
    package-name: pushbridge
```

### Option 3: Custom Script (Current)

The current setup uses a custom Node.js script that:

- Updates package.json and manifest.json versions
- Updates CHANGELOG.md
- Can be extended for more automation

## Best Practices

1. **Always test before releasing**
2. **Keep CHANGELOG.md updated**
3. **Use descriptive commit messages**
4. **Tag releases consistently**
5. **Document breaking changes clearly**
6. **Consider backward compatibility**
7. **Test extension loading after version bumps**

## Rollback Strategy

If a release has issues:

1. **Immediate**: Revert the problematic commit
2. **Create hotfix**:
   ```bash
   npm run version:patch
   git commit -am "hotfix: critical bug fix"
   git push origin main
   ```
3. **Chrome Web Store**: Upload previous working version

## Future Enhancements

Consider implementing:

- Pre-release versions (1.0.0-beta.1)
- Automated changelog generation
- Integration with Chrome Web Store API for automatic publishing
- Version compatibility checks
- Automated testing across Chrome versions
