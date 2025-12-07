# CI/CD Documentation

[← Back to Architecture Index](./index.md)

## Overview

The project uses **GitHub Actions** for continuous integration and continuous deployment workflows. Two main workflows automate code quality checks, builds, and Docker image validation.

---

## Workflows

### 1. Build and Type Check (`build-and-typecheck.yml`)

**Location**: `.github/workflows/build-and-typecheck.yml`

**Purpose**: Validates code quality by running TypeScript type checking and build processes.

**Triggers**:
- Push to `main` branch
- Pull requests targeting `main` branch
- Manual dispatch (`workflow_dispatch`)

**Steps**:

1. **Checkout** - Clones the repository
2. **Setup Node.js 24.x** - Configures Node.js environment
3. **Enable Corepack** - Activates pnpm 10.20.0 package manager
4. **Get pnpm store path** - Retrieves cache location
5. **Cache pnpm store** - Caches dependencies for faster builds
   - Cache key: `${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}`
6. **Install dependencies** - Runs `pnpm -w install --frozen-lockfile`
7. **Typecheck** - Runs `pnpm run tsc` to verify TypeScript types
8. **Build** - Runs `pnpm run build` to compile the project

**Environment**:
- Runner: `ubuntu-latest`
- Node.js: `24.x`
- Package Manager: `pnpm@10.20.0`

**Cache Strategy**:
- Caches pnpm store based on `pnpm-lock.yaml` hash
- Restores from partial keys if exact match not found

---

### 2. Docker Image Build (`docker-image-build.yml`)

**Location**: `.github/workflows/docker-image-build.yml`

**Purpose**: Validates Docker images, runs security scans, and ensures Dockerfile best practices.

**Triggers**:
- Push or PR with changes to:
  - `Dockerfile`
  - `docker-compose.yml`
  - `**/Dockerfile`
  - `docker/**`
- Manual dispatch (`workflow_dispatch`)

**Steps**:

1. **Checkout** - Clones the repository
2. **Run Hadolint** - Lints Dockerfile for best practices
   - Uses: `hadolint/hadolint-action@v3.3.0`
3. **Set up QEMU** - Enables multi-architecture builds
4. **Set up Docker Buildx** - Configures advanced Docker build features
5. **Build Docker image** (PRs/non-main):
   - Build only, no push
   - Tag: `ci-test-image:${{ github.sha }}`
   - Platform: `linux/amd64`
   - Uses GitHub Actions cache
6. **Build Docker image** (main branch):
   - Build only, no push
   - Exports build cache for future builds
   - Cache mode: `max` (aggressive caching)
7. **Scan image for vulnerabilities** - Uses Trivy security scanner
   - Severity levels: `CRITICAL`, `HIGH`
   - Continues on error (non-blocking)
8. **Show local images** - Lists built images with sizes

**Environment**:
- Runner: `ubuntu-latest`
- Platforms: `linux/amd64`
- Cache: GitHub Actions cache (GHA)

**Security Features**:
- **Hadolint**: Dockerfile linting for best practices
- **Trivy**: Vulnerability scanning for container images
- **Image labels**: Adds Git SHA for traceability

**Cache Strategy**:
- Main branch: Exports cache for all layers (`mode=max`)
- PRs: Only consumes cache, doesn't export

---

## GitHub Actions Configuration

### Actions Used

| Action | Version | Purpose |
|--------|---------|---------|
| `actions/checkout` | v5 | Clone repository |
| `actions/setup-node` | v6 | Install Node.js |
| `actions/cache` | v4 | Cache dependencies |
| `hadolint/hadolint-action` | v3.3.0 | Lint Dockerfiles |
| `docker/setup-qemu-action` | v3 | Multi-arch support |
| `docker/setup-buildx-action` | v3 | Docker build features |
| `docker/build-push-action` | v6 | Build Docker images |
| `aquasecurity/trivy-action` | 0.33.1 | Security scanning |

---

## Workflow Patterns

### Branch-Specific Behavior

**Main Branch**:
- Full type checking and build
- Docker image build with cache export
- Vulnerability scanning

**Pull Requests**:
- Same checks as main branch
- Docker image build without cache export
- Security scan continues on error (non-blocking)

### Conditional Logic

```yaml
# Example: Different cache behavior for main vs PRs
if: github.ref == 'refs/heads/main'
```

---

## Best Practices Enforced

### Code Quality
- ✅ TypeScript strict type checking
- ✅ Frozen lockfile ensures reproducible builds
- ✅ pnpm workspace validation

### Docker Best Practices
- ✅ Hadolint ensures Dockerfile follows best practices
- ✅ Multi-stage builds (if implemented in Dockerfile)
- ✅ Layer caching for faster builds
- ✅ Security scanning with Trivy

### Performance Optimization
- ✅ pnpm store caching reduces install time
- ✅ Docker build cache (GHA) reduces build time
- ✅ Conditional cache export (main branch only)

---

## Integration with Development Workflow

### Local Development Alignment

CI workflows mirror local development commands:

```bash
# What CI runs:
pnpm install --frozen-lockfile  # CI uses exact locked versions
pnpm run tsc                    # Type check
pnpm run build                  # Build project

# Docker validation:
docker build -t test-image .    # Local equivalent
hadolint Dockerfile             # Lint locally
trivy image test-image          # Scan locally
```

### Pre-Push Checklist

Before pushing, ensure local success of:
1. `pnpm run tsc` - Type checking
2. `pnpm run build` - Production build
3. `docker build` - Image builds without errors

---

## Monitoring and Debugging

### GitHub Actions UI

View workflow runs at:
```
https://github.com/hkmu-comp3500sef-2025-29/food-ordering-and-tracking-app/actions
```

### Common Issues

**Build failures**:
- Check TypeScript errors in logs
- Verify `pnpm-lock.yaml` is committed
- Ensure Node.js 24.x compatibility

**Docker build failures**:
- Review Hadolint warnings
- Check Dockerfile syntax
- Verify base image availability

**Trivy security warnings**:
- Review vulnerability report
- Update base images
- Update dependencies with known vulnerabilities

---

## Future Enhancements

Potential improvements to CI/CD pipeline:

- [ ] Add automated testing stage (unit, integration tests)
- [ ] Deploy to staging environment on main branch
- [ ] Add code coverage reports
- [ ] Publish Docker images to registry (GHCR, Docker Hub)
- [ ] Add semantic versioning and release automation
- [ ] Integrate linting (Biome) into CI workflow
- [ ] Add performance benchmarking
- [ ] Implement automatic dependency updates (Dependabot)

---

## Related Documentation

- [Build Process](./index.md#build-process) - Local build scripts
- [Package Dependencies](./index.md#package-dependencies) - Dependencies used in CI
- [Dockerfile](../../Dockerfile) - Docker image configuration
- [docker-compose.yml](../../docker-compose.yml) - Local development setup
