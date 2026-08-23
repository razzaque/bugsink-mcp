/**
 * Bugsink API Client
 *
 * Client for interacting with Bugsink's REST API.
 * API docs: https://www.bugsink.com/blog/bugsink-2.0-api/
 */

export interface BugsinkConfig {
  baseUrl: string;
  apiToken: string;
}

export interface PaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Project {
  id: number;
  team: string;
  name: string;
  slug: string;
  dsn: string;
  digested_event_count: number;
  stored_event_count: number;
  alert_on_new_issue: boolean;
  alert_on_regression: boolean;
  alert_on_unmute: boolean;
  visibility: string;
  retention_max_event_count: number;
}

export interface Team {
  id: string;
  name: string;
  visibility: string;
}

export interface Issue {
  id: string;
  project: number;
  digest_order: number;
  first_seen: string;
  last_seen: string;
  digested_event_count: number;
  stored_event_count: number;
  calculated_type: string;
  calculated_value: string;
  transaction: string;
  is_resolved: boolean;
  is_resolved_by_next_release: boolean;
  is_muted: boolean;
}

export interface StackFrame {
  filename: string;
  function: string;
  lineno?: number;
  colno?: number;
  in_app?: boolean;
  context_line?: string;
  pre_context?: string[];
  post_context?: string[];
}

export interface ExceptionValue {
  type: string;
  value: string;
  stacktrace?: {
    frames: StackFrame[];
  };
}

export interface EventData {
  exception?: {
    values?: ExceptionValue[];
  };
  message?: string;
  level?: string;
  platform?: string;
  tags?: Record<string, string>;
  contexts?: Record<string, unknown>;
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };
  browser?: {
    name?: string;
    version?: string;
  };
  os?: {
    name?: string;
    version?: string;
  };
}

export interface Event {
  id: string;
  event_id: string;
  issue: string;
  project: number;
  timestamp: string;
  ingested_at: string;
  digested_at: string;
  digest_order: number;
  grouping: number;
  data?: EventData;
  stacktrace_md?: string;
}

export interface Release {
  id: string;
  project: number;
  version: string;
  date_released: string;
  semver?: string;
  is_semver?: boolean;
  sort_epoch?: number;
}

export interface CreateProjectInput {
  team: string;
  name: string;
  visibility?: 'joinable' | 'discoverable' | 'team_members';
  alert_on_new_issue?: boolean;
  alert_on_regression?: boolean;
  alert_on_unmute?: boolean;
  retention_max_event_count?: number;
}

export interface UpdateProjectInput {
  name?: string;
  visibility?: 'joinable' | 'discoverable' | 'team_members';
  alert_on_new_issue?: boolean;
  alert_on_regression?: boolean;
  alert_on_unmute?: boolean;
  retention_max_event_count?: number;
}

export interface CreateTeamInput {
  name: string;
  visibility?: 'joinable' | 'discoverable' | 'hidden';
}

export interface UpdateTeamInput {
  name?: string;
  visibility?: 'joinable' | 'discoverable' | 'hidden';
}

export interface CreateReleaseInput {
  project: number;
  version: string;
  timestamp?: string;
}

export class BugsinkClient {
  private baseUrl: string;
  private apiToken: string;

  constructor(config: BugsinkConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiToken = config.apiToken;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/canonical/0${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bugsink API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * POST to an issue action endpoint (resolve/mute/reopen/...).
   *
   * Separate from `fetch` because these endpoints are documented as taking no request body
   * and may answer 204 with an empty payload — `response.json()` throws on that, so a
   * successful mutation would surface as a parse error and read as a failure. Returns the
   * decoded body when there is one, `null` when there is not.
   */
  private async action<T>(endpoint: string, body?: unknown): Promise<T | null> {
    const url = `${this.baseUrl}/api/canonical/0${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bugsink API error (${response.status}): ${errorText}`);
    }

    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<PaginatedResponse<Project>> {
    return this.fetch<PaginatedResponse<Project>>('/projects/');
  }

  /**
   * Get a specific project by ID
   */
  async getProject(projectId: number): Promise<Project> {
    return this.fetch<Project>(`/projects/${projectId}/`);
  }

  /**
   * List all teams
   */
  async listTeams(): Promise<PaginatedResponse<Team>> {
    return this.fetch<PaginatedResponse<Team>>('/teams/');
  }

  /**
   * List issues for a project
   */
  async listIssues(projectId: number, options?: {
    status?: string;
    limit?: number;
    sort?: 'digest_order' | 'last_seen';
    order?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Issue>> {
    const params = new URLSearchParams();
    params.set('project', projectId.toString());

    if (options?.status) {
      params.set('status', options.status);
    }
    if (options?.limit) {
      params.set('limit', options.limit.toString());
    }
    if (options?.sort) {
      params.set('sort', options.sort);
    }
    if (options?.order) {
      params.set('order', options.order);
    }

    return this.fetch<PaginatedResponse<Issue>>(`/issues/?${params.toString()}`);
  }

  /**
   * Get a specific issue by ID
   */
  async getIssue(issueId: string): Promise<Issue> {
    return this.fetch<Issue>(`/issues/${issueId}/`);
  }

  /**
   * List events for an issue
   */
  async listEvents(issueId: string, options?: {
    limit?: number;
  }): Promise<PaginatedResponse<Event>> {
    const params = new URLSearchParams();
    params.set('issue', issueId);

    if (options?.limit) {
      params.set('limit', options.limit.toString());
    }

    return this.fetch<PaginatedResponse<Event>>(`/events/?${params.toString()}`);
  }

  /**
   * Get a specific event by ID
   */
  async getEvent(eventId: string): Promise<Event> {
    return this.fetch<Event>(`/events/${eventId}/`);
  }

  /**
   * Test connection to Bugsink instance
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const projects = await this.listProjects();
      return {
        success: true,
        message: `Connected successfully. Found ${projects.results.length} project(s).`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // Mutation Methods
  // ============================================================================

  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    return this.fetch<Project>('/projects/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Update an existing project
   */
  async updateProject(projectId: number, input: UpdateProjectInput): Promise<Project> {
    return this.fetch<Project>(`/projects/${projectId}/`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  /**
   * Get a specific team by ID
   */
  async getTeam(teamId: string): Promise<Team> {
    return this.fetch<Team>(`/teams/${teamId}/`);
  }

  /**
   * Create a new team
   */
  async createTeam(input: CreateTeamInput): Promise<Team> {
    return this.fetch<Team>('/teams/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Update an existing team
   */
  async updateTeam(teamId: string, input: UpdateTeamInput): Promise<Team> {
    return this.fetch<Team>(`/teams/${teamId}/`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  // ============================================================================
  // Stacktrace Methods
  // ============================================================================

  /**
   * Get event stacktrace as pre-rendered Markdown
   */
  async getEventStacktrace(eventId: string): Promise<string> {
    const url = `${this.baseUrl}/api/canonical/0/events/${eventId}/stacktrace/`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bugsink API error (${response.status}): ${errorText}`);
    }

    return response.text();
  }

  // ============================================================================
  // Release Methods
  // ============================================================================

  /**
   * List releases for a project
   */
  async listReleases(projectId: number): Promise<PaginatedResponse<Release>> {
    return this.fetch<PaginatedResponse<Release>>(`/releases/?project=${projectId}`);
  }

  /**
   * Get a specific release by ID
   */
  async getRelease(releaseId: string): Promise<Release> {
    return this.fetch<Release>(`/releases/${releaseId}/`);
  }

  /**
   * Create a new release
   */
  async createRelease(input: CreateReleaseInput): Promise<Release> {
    return this.fetch<Release>('/releases/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ── Issue state ──────────────────────────────────────────────────────────────
  // Each is a POST to an action sub-path, NOT a PATCH on the issue. Worth stating
  // because PATCH /issues/{id}/ is the obvious guess and is not the API.

  /** Mark an issue resolved. */
  async resolveIssue(issueId: string): Promise<Issue | null> {
    return this.action<Issue>(`/issues/${issueId}/resolve/`);
  }

  /**
   * Mark an issue resolved by the NEXT release.
   *
   * Preferred over `resolveIssue` when a fix is merged but not yet deployed: a recurrence
   * after that release ships reopens the issue as a regression, rather than being silently
   * folded back into an already-resolved group. Requires events to carry a `release` — with
   * no release reported, there is no "next" for Bugsink to compare against.
   */
  async resolveIssueNextRelease(issueId: string): Promise<Issue | null> {
    return this.action<Issue>(`/issues/${issueId}/resolve-next/`);
  }

  /** Mute an issue indefinitely. */
  async muteIssue(issueId: string): Promise<Issue | null> {
    return this.action<Issue>(`/issues/${issueId}/mute/`);
  }

  /** Mute an issue for a fixed period. */
  async muteIssueForPeriod(
    issueId: string,
    periodName: string,
    nrOfPeriods: number,
  ): Promise<Issue | null> {
    return this.action<Issue>(`/issues/${issueId}/mute-for/`, {
      period_name: periodName,
      nr_of_periods: nrOfPeriods,
    });
  }

  /** Mute an issue until it recurs at least `gteThreshold` times in the given window. */
  async muteIssueUntilThreshold(
    issueId: string,
    periodName: string,
    nrOfPeriods: number,
    gteThreshold: number,
  ): Promise<Issue | null> {
    return this.action<Issue>(`/issues/${issueId}/mute-until/`, {
      period_name: periodName,
      nr_of_periods: nrOfPeriods,
      gte_threshold: gteThreshold,
    });
  }

  /** Unmute an issue. */
  async unmuteIssue(issueId: string): Promise<Issue | null> {
    return this.action<Issue>(`/issues/${issueId}/unmute/`);
  }

  /** Reopen a resolved or muted issue. */
  async reopenIssue(issueId: string): Promise<Issue | null> {
    return this.action<Issue>(`/issues/${issueId}/reopen/`);
  }
}
