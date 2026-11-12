import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Box,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Cloud,
  Cpu,
  Database,
  ExternalLink,
  GitBranch,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Menu,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Terminal,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, fetchPrometheus, formatTime } from './services/api'

const navigation = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'CI/CD Pipeline', path: '/pipeline', icon: GitBranch },
  { label: 'Deployments', path: '/deployments', icon: Cloud },
  { label: 'Security Scans', path: '/security', icon: ShieldCheck },
  { label: 'Infrastructure', path: '/infrastructure', icon: Server },
  { label: 'Monitoring', path: '/monitoring', icon: Activity },
  { label: 'Audit Logs', path: '/audit', icon: ListChecks },
]

const initialData = {
  status: null,
  deployments: [],
  deploymentCount: 0,
  services: [],
  prometheus: false,
  metrics: {
    history: [],
    currentRate: null,
    p95: null,
  },
  jenkins: {
    status: 'loading',
    job: null,
    builds: [],
    error: null,
  },
}

/**
 * Fetches dashboard data without changing React state.
 * Keeping this function outside the component allows the initial effect
 * and the manual refresh action to use the same data-loading logic.
 */
async function fetchDashboardData() {
  const now = Date.now() / 1000
  const start = Math.floor(now - 60 * 60)
  const end = Math.floor(now)

  const [statusResult, deploymentsResult, targetsResult, rateResult, p95Result, jenkinsResult] =
    await Promise.allSettled([
      api.get('/api/status'),
      api.get('/api/deployments'),
      fetchPrometheus('/api/v1/targets?state=active'),
      fetchPrometheus(
        `/api/v1/query_range?query=${encodeURIComponent(
          'sum(rate(secureflow_http_requests_total[5m]))',
        )}&start=${start}&end=${end}&step=300`,
      ),
      fetchPrometheus(
        `/api/v1/query?query=${encodeURIComponent(
          'histogram_quantile(0.95,sum(rate(secureflow_http_request_duration_seconds_bucket[5m]))by(le))',
        )}`,
      ),
      api.get('/api/jenkins/builds'),
    ])

  const status =
    statusResult.status === 'fulfilled'
      ? statusResult.value.data
      : null

  const deploymentsPayload =
    deploymentsResult.status === 'fulfilled'
      ? deploymentsResult.value.data
      : { deployments: [], count: 0 }

  const targetData =
    targetsResult.status === 'fulfilled'
      ? targetsResult.value.data?.activeTargets ?? []
      : []

  const services = targetData.map((target) => ({
    name: target.labels?.job || target.scrapeUrl || 'Unknown target',
    endpoint: target.scrapeUrl || '',
    up: target.health === 'up' ? 1 : 0,
    health: target.health || 'unknown',
  }))

  const rawHistory =
    rateResult.status === 'fulfilled'
      ? rateResult.value.data?.result?.[0]?.values ?? []
      : []

  const history = rawHistory
    .map(([timestamp, value]) => ({
      time: new Date(Number(timestamp) * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: Number(value),
    }))
    .filter((point) => Number.isFinite(point.value))

  const currentRate = history.length
    ? history[history.length - 1].value.toFixed(3)
    : null

  const p95Raw =
    p95Result.status === 'fulfilled'
      ? p95Result.value.data?.result?.[0]?.value?.[1]
      : null

  const p95 =
    p95Raw !== null && p95Raw !== undefined && Number.isFinite(Number(p95Raw))
      ? `${Number(p95Raw).toFixed(3)}s`
      : null

  const deployments = Array.isArray(deploymentsPayload.deployments)
    ? deploymentsPayload.deployments
    : []

  const jenkinsPayload =
    jenkinsResult.status === 'fulfilled'
      ? jenkinsResult.value.data
      : null

  const jenkins = {
    status: jenkinsPayload?.status || 'unavailable',
    job: jenkinsPayload?.job || null,
    builds: jenkinsPayload?.builds || [],
    error:
      jenkinsPayload?.error ||
      (jenkinsResult.status === 'rejected'
        ? 'Unable to retrieve Jenkins build history.'
        : null),
  }

  const data = {
    status,
    deployments,
    deploymentCount:
      deploymentsPayload.count ?? deployments.length,
    services,
    prometheus: targetsResult.status === 'fulfilled',
    metrics: {
      history,
      currentRate,
      p95,
    },
    jenkins
  }

  let error = ''
  if (
    statusResult.status === 'rejected' &&
    deploymentsResult.status === 'rejected'
  ) {
    error =
      'The Flask API could not be reached. Check the staging API on port 5003.'
  } else if (
    statusResult.status === 'rejected' ||
    deploymentsResult.status === 'rejected'
  ) {
    error = 'Some Flask API data could not be loaded. Check the staging API.'
  } else if (targetsResult.status === 'rejected') {
    error = 'Prometheus could not be reached. Check the Prometheus service on port 9090.'
  }

  return { data, error }
}

function StatusDot({ status }) {
  const normalized = String(status || '').toLowerCase()
  const good = ['ok', 'ready', 'running', 'success', 'up', 'healthy'].includes(
    normalized,
  )
  const bad = ['failed', 'down', 'error', 'not_ready'].includes(normalized)

  return (
    <span
      className={`status-dot ${good ? 'good' : bad ? 'bad' : 'muted'}`}
      aria-label={normalized || 'unknown'}
    />
  )
}

function Badge({ children, tone = 'neutral' }) {
  const status =
    tone === 'success'
      ? 'ok'
      : tone === 'danger'
        ? 'failed'
        : 'unknown'

  return (
    <span className={`badge badge-${tone}`}>
      <StatusDot status={status} />
      {children}
    </span>
  )
}

function MetricCard({ title, value, detail, icon: Icon, tone = 'blue', trend }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{title}</span>
        <span className={`metric-icon ${tone}`}>
          <Icon size={18} />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">
        {trend && (
          <span className="trend">
            <ArrowUpRight size={14} />
            {trend}
          </span>
        )}
        {detail}
      </div>
    </article>
  )
}

function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ icon: Icon = Database, title, description }) {
  return (
    <div className="empty-state">
      <Icon size={25} />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  )
}

function AppShell({ children, refresh, refreshedAt, loading }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const current =
    navigation.find((item) => item.path === location.pathname) || navigation[0]

  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Shield size={21} />
          </div>
          <div>
            <strong>SecureFlow</strong>
            <span>DEVOPS CONTROL PLANE</span>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace">
          <div className="workspace-avatar">S</div>
          <div>
            <strong>SecureFlow Platform</strong>
            <span>Infrastructure team</span>
          </div>
          <ChevronDown size={15} />
        </div>

        <div className="nav-label">PLATFORM</div>
        <nav className="nav-list">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === 'Security Scans' && <i className="nav-count">0</i>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-card">
            <div className="system-card-title">
              <span className="live-pulse" />
              SYSTEM STATUS
            </div>
            <strong>Monitoring status</strong>
            <p>Live status is based on the connected monitoring data.</p>
          </div>
          <div className="profile">
            <div className="profile-avatar">SF</div>
            <div>
              <strong>Platform Admin</strong>
              <span>Administrator</span>
            </div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumbs">
              Platform <span>/</span> <strong>{current.label}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="environment-pill">
              <span className="env-dot" />
              All environments
              <ChevronDown size={13} />
            </div>
            <span className="topbar-divider" />
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} />
              <i />
            </button>
            <button
              className="refresh-button"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw
                size={15}
                className={loading ? 'spin' : ''}
              />
              Refresh
            </button>
            <span className="updated-label">
              Updated {refreshedAt ? formatTime(refreshedAt) : '—'}
            </span>
          </div>
        </header>

        <div className="page-content">{children}</div>

        <footer className="footer">
          <span>
            SecureFlow <b>•</b> DevOps Automation &amp; Infrastructure Monitoring
          </span>
          <span>API-driven operational view</span>
        </footer>
      </main>
    </div>
  )
}

function Overview({ data, refresh }) {
  const { status, deployments, metrics, services } = data
  const deploymentRows = deployments.slice(0, 5)
  const chartData = metrics.history
  const healthyCount = services.filter((service) => service.up === 1).length

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PLATFORM OVERVIEW</div>
          <h1>Good to see you.</h1>
          <p>
            Here&apos;s what&apos;s happening across your delivery infrastructure.
          </p>
        </div>
        <button className="primary-button" onClick={refresh}>
          <RefreshCw size={15} />
          Refresh data
        </button>
      </div>

      <div className="metric-grid">
        <MetricCard
          title="API STATUS"
          value={
            status?.status === 'running' || status?.status === 'ok'
              ? 'Operational'
              : 'Unavailable'
          }
          detail={status?.version ? `Version ${status.version}` : 'Status endpoint'}
          icon={Activity}
          tone="green"
        />
        <MetricCard
          title="DEPLOYMENTS"
          value={data.deploymentCount}
          detail="Records in deployment registry"
          icon={Cloud}
          tone="purple"
        />
        <MetricCard
          title="MONITORING TARGETS"
          value={`${healthyCount}/${services.length}`}
          detail="Prometheus targets reporting UP"
          icon={Gauge}
          tone="blue"
        />
        <MetricCard
          title="SECURITY FINDINGS"
          value="—"
          detail="Scan report integration not connected"
          icon={ShieldCheck}
          tone="amber"
        />
      </div>

      <div className="content-grid overview-grid">
        <Panel
          title="API request activity"
          subtitle="Request rate from Prometheus · requests/second"
          action={
            <span className="chart-legend">
              <i />
              Request rate
            </span>
          }
        >
          {chartData.length ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="requestFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#5b8def" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#5b8def" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#202b3b"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#7e8ba0', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#7e8ba0', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#111b2a',
                      border: '1px solid #26354a',
                      borderRadius: 8,
                      color: '#e8eef8',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#6b9bff"
                    strokeWidth={2}
                    fill="url(#requestFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No request-rate samples yet"
              description="Prometheus has not returned usable API request-rate data."
            />
          )}
        </Panel>

        <Panel
          title="Environment health"
          subtitle="Live Prometheus scrape status"
        >
          <div className="environment-list">
            {services.length ? (
              services.map((service) => (
                <div className="environment-row" key={service.name}>
                  <div className="service-icon">
                    <Server size={16} />
                  </div>
                  <div className="environment-info">
                    <strong>{service.name}</strong>
                    <span>{service.endpoint || 'Prometheus target'}</span>
                  </div>
                  <Badge tone={service.up === 1 ? 'success' : 'danger'}>
                    {service.up === 1 ? 'UP' : 'DOWN'}
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Server}
                title="Monitoring data unavailable"
                description="Check the Prometheus connection and targets."
              />
            )}
          </div>
        </Panel>
      </div>

      <Panel
        title="Recent deployments"
        subtitle="Latest records from the SecureFlow deployment registry"
        action={
          <NavLink className="text-link" to="/deployments">
            View all <ExternalLink size={13} />
          </NavLink>
        }
      >
        <DeploymentTable rows={deploymentRows} />
      </Panel>
    </>
  )
}

function DeploymentTable({ rows }) {
  if (!rows.length) {
    return (
      <EmptyState
        icon={Cloud}
        title="No deployment records"
        description="Deployment history will appear here when records are added to the API."
      />
    )
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>VERSION</th>
            <th>ENVIRONMENT</th>
            <th>STATUS</th>
            <th>DEPLOYMENT ID</th>
            <th>CREATED</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong className="mono">{row.version}</strong>
              </td>
              <td>
                <span className={`env-tag ${row.environment}`}>
                  {row.environment}
                </span>
              </td>
              <td>
                <Badge
                  tone={
                    row.status === 'success'
                      ? 'success'
                      : row.status === 'failed'
                        ? 'danger'
                        : 'neutral'
                  }
                >
                  {row.status}
                </Badge>
              </td>
              <td className="muted-cell">#{row.id}</td>
              <td className="muted-cell">
                {row.created_at ? formatTime(row.created_at) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PageHeader({ eyebrow, title, description }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  )
}

function Deployments({ data }) {
  const [filter, setFilter] = useState('all')
  const filtered = data.deployments.filter(
    (deployment) =>
      filter === 'all' || deployment.environment === filter,
  )

  return (
    <>
      <PageHeader
        eyebrow="RELEASE MANAGEMENT"
        title="Deployments"
        description="Track application releases across development, staging and production."
      />
      <div className="filter-row">
        <div className="filter-tabs">
          {['all', 'development', 'staging', 'production'].map((item) => (
            <button
              key={item}
              className={filter === item ? 'selected' : ''}
              onClick={() => setFilter(item)}
            >
              {item === 'all'
                ? 'All environments'
                : item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <span className="result-count">{filtered.length} records</span>
      </div>
      <Panel
        title="Deployment history"
        subtitle="Source: GET /api/deployments"
      >
        <DeploymentTable rows={filtered} />
      </Panel>
    </>
  )
}


function Pipeline({ data }) {
  const jenkins = data.jenkins
  const builds = jenkins.builds || []

  const formatDuration = (milliseconds) => {
    if (!milliseconds) return '—'
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    return minutes
      ? `${minutes}m ${seconds % 60}s`
      : `${seconds}s`
  }

  const formatBuildDate = (timestamp) => {
    if (!timestamp) return '—'
    return new Date(timestamp).toLocaleString()
  }

  return (
    <>
      <PageHeader
        eyebrow="CONTINUOUS DELIVERY"
        title="CI/CD Pipeline"
        description="The SecureFlow delivery workflow and live Jenkins build history."
      />

      <div className="callout">
        <GitBranch size={18} />
        <div>
          <strong>Jenkins: {jenkins.job || 'SecureFlow-CI-CD'}</strong>
          <span>
            {jenkins.status === 'ok'
              ? `${builds.length} actual builds retrieved from Jenkins.`
              : jenkins.error || 'Waiting for Jenkins data.'}
          </span>
        </div>
        <Badge tone={jenkins.status === 'ok' ? 'success' : 'danger'}>
          {jenkins.status === 'ok' ? 'Connected' : 'Unavailable'}
        </Badge>
      </div>

      <div className="metric-grid three">
        <MetricCard
          title="LATEST BUILD"
          value={builds[0] ? `#${builds[0].number}` : '—'}
          detail="Most recent Jenkins build"
          icon={GitBranch}
          tone="blue"
        />
        <MetricCard
          title="BUILD RESULT"
          value={builds[0]?.result || '—'}
          detail="Latest pipeline execution"
          icon={CheckCircle2}
          tone={builds[0]?.result === 'SUCCESS' ? 'green' : 'amber'}
        />
        <MetricCard
          title="RECORDED BUILDS"
          value={builds.length}
          detail="Retrieved from Jenkins"
          icon={Clock3}
          tone="purple"
        />
      </div>

      <Panel
        title="Recent Jenkins builds"
        subtitle="Live data from GET /api/jenkins/builds"
        action={
          <a
            className="text-link"
            href="http://127.0.0.1:8080/job/SecureFlow-CI-CD/"
            target="_blank"
            rel="noreferrer"
          >
            Open Jenkins <ExternalLink size={13} />
          </a>
        }
      >
        {builds.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>BUILD</th>
                  <th>RESULT</th>
                  <th>DURATION</th>
                  <th>STARTED</th>
                  <th>JENKINS</th>
                </tr>
              </thead>
              <tbody>
                {builds.map((build) => (
                  <tr key={build.number}>
                    <td>
                      <strong className="mono">#{build.number}</strong>
                    </td>
                    <td>
                      <Badge
                        tone={
                          build.result === 'SUCCESS'
                            ? 'success'
                            : build.result === 'FAILURE'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {build.result}
                      </Badge>
                    </td>
                    <td>{formatDuration(build.duration)}</td>
                    <td className="muted-cell">
                      {formatBuildDate(build.timestamp)}
                    </td>
                    <td>
                      <a
                        className="text-link"
                        href={build.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View build <ExternalLink size={13} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={GitBranch}
            title="No build history available"
            description={
              jenkins.error ||
              'Check the Jenkins connection and refresh the dashboard.'
            }
          />
        )}
      </Panel>

      <Panel
        title="Delivery workflow"
        subtitle="Configured pipeline stages"
      >
        <div className="pipeline-list">
          {[
            ['Source checkout', 'GitHub repository', 'Configured in Jenkinsfile', 'source'],
            ['Build & test', 'Python application', 'Jenkins pipeline stage', 'build'],
            ['Security analysis', 'Bandit · pip-audit · Trivy', 'Security scan stage', 'security'],
            ['Container publish', 'Docker image build', 'Image pipeline stage', 'container'],
            ['Staging deployment', 'Ansible deployment', 'Staging environment', 'staging'],
            ['Production release', 'Ansible deployment', 'Production environment', 'production'],
          ].map(([title, detail, note, key], index) => (
            <div className="pipeline-stage" key={key}>
              <div className="stage-rail">
                <div className="stage-number">
                  {String(index + 1).padStart(2, '0')}
                </div>
                {index !== 5 && <div className="stage-line" />}
              </div>
              <div className="stage-content">
                <div>
                  <strong>{title}</strong>
                  <span>{detail}</span>
                  <small>{note}</small>
                </div>
                <Badge>Configured</Badge>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}


function Security() {
  return (
    <>
      <PageHeader
        eyebrow="APPLICATION SECURITY"
        title="Security scans"
        description="Visibility into static analysis, dependency auditing and container vulnerability scanning."
      />
      <div className="metric-grid three">
        <MetricCard
          title="BANDIT"
          value="—"
          detail="Latest report not connected"
          icon={ShieldCheck}
          tone="green"
        />
        <MetricCard
          title="DEPENDENCY AUDIT"
          value="—"
          detail="Latest report not connected"
          icon={Database}
          tone="blue"
        />
        <MetricCard
          title="TRIVY IMAGE SCAN"
          value="—"
          detail="Latest report not connected"
          icon={Box}
          tone="amber"
        />
      </div>
      <Panel
        title="Security posture"
        subtitle="Scan results are intentionally not simulated"
      >
        <EmptyState
          icon={ShieldCheck}
          title="Security report integration pending"
          description="The CI pipeline runs Bandit, pip-audit and Trivy. Connect archived Jenkins reports or local JSON reports to display findings here."
        />
      </Panel>
      <div className="callout">
        <AlertTriangle size={18} />
        <div>
          <strong>Report visibility limitation</strong>
          <span>
            The dashboard does not currently read archived Jenkins artifacts.
            No vulnerability counts are fabricated.
          </span>
        </div>
      </div>
    </>
  )
}

function Infrastructure({ data }) {
  const upCount = data.services.filter((service) => service.up === 1).length
  const downCount = data.services.length - upCount

  return (
    <>
      <PageHeader
        eyebrow="RUNTIME ENVIRONMENT"
        title="Infrastructure"
        description="Health and availability of monitored SecureFlow services."
      />
      <div className="metric-grid three">
        <MetricCard
          title="PROMETHEUS TARGETS"
          value={data.services.length}
          detail="Discovered scrape targets"
          icon={Gauge}
          tone="blue"
        />
        <MetricCard
          title="TARGETS UP"
          value={upCount}
          detail="Currently reporting healthy"
          icon={CheckCircle2}
          tone="green"
        />
        <MetricCard
          title="TARGETS DOWN"
          value={downCount}
          detail="Unavailable or not reporting"
          icon={AlertTriangle}
          tone="amber"
        />
      </div>
      <Panel
        title="Monitored targets"
        subtitle="Live data from Prometheus /api/v1/targets"
      >
        <div className="target-grid">
          {data.services.length ? (
            data.services.map((service) => (
              <div className="target-card" key={service.name}>
                <div className="target-card-top">
                  <div className="service-icon">
                    <Server size={17} />
                  </div>
                  <Badge tone={service.up === 1 ? 'success' : 'danger'}>
                    {service.up === 1 ? 'UP' : 'DOWN'}
                  </Badge>
                </div>
                <strong>{service.name}</strong>
                <span>{service.endpoint || 'Endpoint not reported'}</span>
                <small>{service.health || 'Unknown health'}</small>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Server}
              title="No targets returned"
              description="Prometheus target data is unavailable."
            />
          )}
        </div>
      </Panel>
    </>
  )
}

function Monitoring({ data }) {
  return (
    <>
      <PageHeader
        eyebrow="OBSERVABILITY"
        title="Monitoring"
        description="Application telemetry and infrastructure monitoring status."
      />
      <div className="metric-grid three">
        <MetricCard
          title="PROMETHEUS"
          value={data.prometheus ? 'Connected' : 'Unavailable'}
          detail="Query API connectivity"
          icon={Activity}
          tone={data.prometheus ? 'green' : 'amber'}
        />
        <MetricCard
          title="API REQUEST RATE"
          value={data.metrics.currentRate ?? '—'}
          detail="Requests per second"
          icon={Gauge}
          tone="blue"
        />
        <MetricCard
          title="P95 LATENCY"
          value={data.metrics.p95 ?? '—'}
          detail="Seconds · Prometheus histogram"
          icon={Clock3}
          tone="purple"
        />
      </div>

      <Panel
        title="Request rate trend"
        subtitle="Prometheus range query · last 60 minutes"
      >
        {data.metrics.history.length ? (
          <div className="chart-wrap tall">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.metrics.history}>
                <CartesianGrid
                  stroke="#202b3b"
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#7e8ba0', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#7e8ba0', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111b2a',
                    border: '1px solid #26354a',
                    borderRadius: 8,
                    color: '#e8eef8',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6b9bff"
                  fill="#5b8def"
                  fillOpacity={0.12}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={Activity}
            title="No telemetry samples"
            description="The Prometheus query did not return request-rate samples."
          />
        )}
      </Panel>

      <Panel
        title="Monitoring stack"
        subtitle="Configured observability components"
      >
        <div className="stack-list">
          {[
            ['Prometheus', 'Metrics collection and query engine', 'localhost:9090'],
            ['Grafana', 'Dashboards and visualization', 'localhost:3000'],
            ['Node Exporter', 'Host-level metrics exporter', '9100'],
            ['cAdvisor', 'Container resource metrics exporter', '8080'],
          ].map(([name, description, port]) => (
            <div className="stack-row" key={name}>
              <div className="service-icon">
                <Cpu size={16} />
              </div>
              <div>
                <strong>{name}</strong>
                <span>{description}</span>
              </div>
              <code>{port}</code>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}

function Audit() {
  return (
    <>
      <PageHeader
        eyebrow="GOVERNANCE"
        title="Audit logs"
        description="Operational activity and deployment record visibility."
      />
      <Panel
        title="Audit event stream"
        subtitle="Events currently available through the deployment registry"
      >
        <EmptyState
          icon={Terminal}
          title="Dedicated audit endpoint not configured"
          description="The current Flask API exposes deployment records but does not expose a separate audit-log endpoint. This view will populate when an audit API is added."
        />
      </Panel>
    </>
  )
}

export default function App() {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshedAt, setRefreshedAt] = useState(null)

  // Initial load: the state updates happen after the asynchronous request.
  useEffect(() => {
    let active = true

    fetchDashboardData()
      .then(({ data: nextData, error: nextError }) => {
        if (!active) return
        setData(nextData)
        setError(nextError)
        setRefreshedAt(new Date())
      })
      .catch(() => {
        if (!active) return
        setError('An unexpected error occurred while loading dashboard data.')
      })

    return () => {
      active = false
    }
  }, [])

  const refresh = async () => {
    setLoading(true)
    try {
      const result = await fetchDashboardData()
      setData(result.data)
      setError(result.error)
      setRefreshedAt(new Date())
    } catch {
      setError('An unexpected error occurred while refreshing dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  const shared = { data, refresh }

  return (
    <AppShell
      refresh={refresh}
      refreshedAt={refreshedAt}
      loading={loading}
    >
      {error && (
        <div className="error-banner">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}
      <Routes>
        <Route path="/" element={<Overview {...shared} />} />
        <Route path="/pipeline" element={<Pipeline data={data} />} />
        <Route path="/deployments" element={<Deployments {...shared} />} />
        <Route path="/security" element={<Security />} />
        <Route path="/infrastructure" element={<Infrastructure {...shared} />} />
        <Route path="/monitoring" element={<Monitoring {...shared} />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="*" element={<Overview {...shared} />} />
      </Routes>
    </AppShell>
  )
}
