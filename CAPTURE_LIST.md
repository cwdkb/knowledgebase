# CRM Playbook - Visual Capture List (Builder Prime)

Grouped by pipeline stage / process, in suggested capture order. For each item: where it lives in the nav, whether it maps to an existing text/checklist KB section or is undocumented, whether to capture as video or screenshot, priority, and capture status.

## 1. Lead Pipeline - Movement Across Stages (New Lead -> Job Closed)

| Screen/Workflow | Nav Location | Maps To | Capture | Priority | Status |
|---|---|---|---|---|---|
| Lead Status dropdown & stage change on a client record | Clients > [any lead] > Client Details > Lead Status field | Main Pipeline (text-only today) | Video - open dropdown, pick new stage, Save, watch badge update | High | Pending |
| Clients list with status abbreviation badges (L, NS, SO, LOH, LD, ND, P, C, etc.) | Clients > Show All | Branch & Exit Statuses (text-only today) | Screenshot | High | Captured - `assets/01-clients-list-badges.png` — embedded under "Reference Captures" in Branch & Exit Statuses tab |
| Client Activity feed showing "Lead Status Change" / "Project Status Change" history entries | Client record > Client Activity | Main Pipeline / Branch & Exit Statuses | Screenshot | Low | Captured - `assets/02-client-activity-feed.png` — embedded under "Reference Captures" in Branch & Exit Statuses tab |
| Lead Statuses admin list (categories: Leads/Prospects/Sales/Production/Customers + Default & Rehash Default flags) | Admin > Configure > Lead Statuses | Main Pipeline / Branch & Exit Statuses | Video - scroll through full list, too long for one screenshot | Low (admin/setup, not rep-facing) | Captured - `assets/03-lead-statuses-admin-list.mp4` — embedded under "Reference Captures" in Main Pipeline tab |
| Reporting Milestones panel (Happy Path vs. Terminal status mapping) | Admin > Configure > Lead Statuses > Reporting Milestones | Branch & Exit Statuses - this is literally the system's own branch/exit logic | Video | Low (admin/setup) | Captured - `assets/04-reporting-milestones-panel.mp4` — embedded under "Reference Captures" in Branch & Exit Statuses tab, poster `assets/04-reporting-milestones-panel-poster.png` |

## 2. Rehash Process (L-A-D-R)

| Screen/Workflow | Nav Location | Maps To | Capture | Priority | Status |
|---|---|---|---|---|---|
| "Rehash" button -> new opportunity auto-created with rehash status pre-set | Client record > Rehash button | Rehash Process (text-only today) | Video - multi-step: click, new opportunity opens, fields populate, Save | High | Pending |
| Rehash automations (auto email/SMS nudges tied to "Demo/No Sale - Rehash") | Admin > Automations > Project Status Automations | Rehash Process | Screenshot | Low (admin/setup) | Pending |
| Default Rehash Sales Person setting | Admin > Configure > Client Settings > Defaults | Rehash Process | Screenshot | Low | Pending |

## 3. Production Pipeline & Work Orders

| Screen/Workflow | Nav Location | Maps To | Capture | Priority | Status |
|---|---|---|---|---|---|
| Project record - Project Status dropdown + full tab set (Info, Measure Sheet, Scopes, Contracts, Billing, Photos, Documents, Chat, To-dos) | Projects > [any job] | Undocumented - a separate, more granular production pipeline (Job Sold -> Finance Pending -> Deposit Invoice Sent -> Remeasure -> Ready to be Ordered -> Ordered & Costed -> Job Closed) not covered by the Main Pipeline doc | Video - very multi-step | High | Pending |
| Project sub-nav status filters (Demo, Estimate Sent, Finance Pending, Remeasure Booked, etc.) | Projects sidebar | Undocumented | Screenshot | High | Pending |
| Work Order detail - manual status dropdown (Unscheduled -> Scheduled -> In Progress -> Complete -> Invoiced -> Paid -> Cancelled) | Work Orders > [any WO] > Job tab | Work Order Status (confirmed manual-only) | Video | High | Pending |
| Work Orders sub-nav status filters | Work Orders sidebar | Work Order Status | Screenshot | High | Pending |
| Automations panel showing only "Lead Status" and "Project Status" columns - no Work Order Status automation panel exists | Admin > Automations | Work Order Status - direct proof of the "manual-only, no automation" claim | Screenshot | Low (admin/setup, but good one-time evidence shot) | Pending |
| "Work History" section on a client (New Project / New Work Order entry points) | Client record > Work History | Undocumented (entry point reps actually use weekly) | Video | High | Pending |

## 4. To-Dos Process

| Screen/Workflow | Nav Location | Maps To | Capture | Priority | Status |
|---|---|---|---|---|---|
| New To-Do modal (Task Title, Assigned To, Project/Project Task link, Due Date, Type, Reminder) | Client record > Client Activity > New To-do | To-Dos Process (text-only today) | Video | High | Pending |
| Project-level To-dos tab, including auto-generated to-dos (e.g. "Deposit Invoice Required") mixed with manual ones | Projects > [job] > To-dos tab | To-Dos Process | Screenshot | High | Pending |
| "My To-do Tasks For Today" widget | Dashboard | To-Dos Process | Screenshot | High | Pending |

## 5. Lead Sources

| Screen/Workflow | Nav Location | Maps To | Capture | Priority | Status |
|---|---|---|---|---|---|
| Lead Source dropdown on a client record | Client Details > Lead Source field | Lead Sources (text-only today) | Screenshot | High | Pending |
| Lead Sources admin list (35 sources grouped by category: Online Discovery, Print Media, Social Media, Google, Home Show) | Admin > Configure > Client Settings > Lead Sources | Lead Sources | Screenshot | Low (admin/setup) | Pending |

## 6. Team Responsibilities

| Screen/Workflow | Nav Location | Maps To | Capture | Priority | Status |
|---|---|---|---|---|---|
| Employees list (Name, User Type, User Role) | Admin > Employees | Team Responsibilities (text-only today) | Screenshot | Low (admin-only) | Pending |
| Edit Employee modal (User Role + role-driven checkboxes: Sales Person/PM/Foreman dropdown visibility) | Admin > Employees > [employee] | Team Responsibilities | Screenshot | Low (admin-only) | Pending |

## 7. Reporting & Dashboard (fully undocumented)

| Screen/Workflow | Nav Location | Maps To | Capture | Priority | Status |
|---|---|---|---|---|---|
| Dashboard KPI + pipeline widgets (New Opportunities, Appointments Set, Leads Issued, Sales/Production Pipeline totals) | Dashboard | Undocumented | Screenshot | High (first thing most staff see, ties several pipeline concepts together) | Pending |
| Production/Sales Calendar (monthly scheduling view of jobs and work orders) | Dashboard > Production/Sales Calendar | Undocumented - scheduling isn't covered anywhere in the current 7 KB sections | Video | High | Pending |
| Sales Pipeline report generation (filter checkbox, Run, results table, Excel export) | Reports > Sales and Marketing > Sales Pipeline | Undocumented | Video | Low (manager-level, occasional use) | Pending |

---

### Notes
- The Project Status pipeline (Section 3) is the biggest documentation gap - a whole second, more granular pipeline sitting between "lead" and "work order" that isn't mentioned anywhere in the current KB, with 15+ statuses. Prioritize this video early.
- The Automations screen (Admin > Automations) is a good supporting screenshot for the Work Order Status page, since it visually proves there's no automation panel for that object type.
