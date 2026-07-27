-- Knowledge Base search index — schema + seed data
-- Run this ONCE in Supabase: Dashboard → SQL Editor → New Query → paste → Run
-- Safe to re-run: drops and recreates the table each time you need to refresh content.

drop table if exists search_index;

create table search_index (
  id bigint generated always as identity primary key,
  page text not null,
  section_title text not null,
  content text not null,
  url text not null,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(section_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) stored
);

create index search_index_vector_idx on search_index using gin(search_vector);

alter table search_index enable row level security;

create policy "Public read access"
  on search_index
  for select
  using (true);

-- ============================================================
-- 001 — Builder Prime CRM Playbook
-- ============================================================
insert into search_index (page, section_title, content, url) values
('Builder Prime CRM Playbook', 'Visual Map', 'Visual diagram of the full lead and project lifecycle pipeline, zoomable, click any stage box to preview its detail.', '001-crm-playbook/index.html#visual-map'),
('Builder Prime CRM Playbook', 'Full Pipeline at a Glance', 'Canonical bucket names following the Bucket Cheat Sheet. Auto fires automatically with no manual step, Manual requires a rep or staff action. Covers Lead Stage and Lead Status buckets like New Lead 1st Touch, Speed to Lead, Lead Not Set Rehash, Lead On Hold, Lead Set, Lead Cancel Do Not Reset, Lead Confirmed.', '001-crm-playbook/index.html#pipeline-glance'),
('Builder Prime CRM Playbook', 'Main Pipeline', 'Full detail on every main pipeline status from New Lead through Job Closed: New Lead 1st Touch, Speed to Lead 2/3/4, Lead Set, Lead Confirmed and Issued, Demo, Estimate Sent 3 Nudges, E-Signature Sent, Salesrep to Sign, Job Sold, Job Sold Deposit Required, Finance Pending, Deposit Invoice Sent, Remeasure Need to Book Booked, Order and Cost Ready Ordered Costed, Install Received Booked In Progress, Incomplete Install, Invoice Complete Incomplete Paid Cash Out, Job Closed Customer, CWD Service, Manufacture Service, Service Booked.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Branch & Exit Statuses', 'Full detail on branch and exit statuses: Lead Disqualified, Supply Only, Lead On Hold, Lead Not Set Rehash, No Show Reset, No Demo, Lead Cancelled Reset, Lead Cancel Do Not Reset, Demo No Sale Rehash 31-day auto-advance, Pending Follow Up, Pending on e-sig expiry, Contract On Hold Change Order, Job Sold Canceled, Job Sold Finance Rejected, Job Lost, Job Cancelled Declined.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Work Order Status', 'Work Order status field, a separate module from Lead Status and Project Status. Flow: Unscheduled, Scheduled, In Progress, Complete, Invoiced, Paid, Cancelled. Confirmed manual dropdown only, no automation panel exists for Work Order status changes unlike Lead and Project status.', '001-crm-playbook/index.html#work-order-status'),
('Builder Prime CRM Playbook', 'Team Responsibilities', 'Lead Management owned by Seth and Tristyn — Seth manages inbound Facebook/Instagram lead inquiries, Tristyn is backup. SEO, Google Ads and Google My Business managed externally by Ryan at Gooder Marketing, with internal Google My Business ownership too.', '001-crm-playbook/index.html#team-responsibilities'),
('Builder Prime CRM Playbook', 'To-Dos Process', 'Review cadence: every staff member reviews open To-Dos twice a day, morning and afternoon, overdue and due-today items sort to top. All customer contact tasks are created as To-Dos, never as Call Queue entries — Call Queue is front-desk-only general call logging. Naming convention: Call [Customer Name] – [Purpose].', '001-crm-playbook/index.html#todos-process'),
('Builder Prime CRM Playbook', 'Rehash Process (L-A-D-R)', 'Lead Not Set Rehash process: Locate leads inactive 1-2 months or longer that already received all automated follow-ups. Assess whether an estimate was scheduled and confirm no recent customer response. Do: call first, then follow up by text.', '001-crm-playbook/index.html#rehash-script'),
('Builder Prime CRM Playbook', 'Lead Sources', 'Lead sources at a glance: Google Paid Search, LSA, Online Discovery managed by Gooder Marketing/Ryan Tomlinson. Meta Ads Facebook and Instagram managed by CGF Media/Cael Firth. Facebook and Instagram Organic managed by Complete WD plus LADR Consulting/Sonia Dibias. Full spend-tracking detail lives in the Marketing SOP.', '001-crm-playbook/index.html#lead-sources'),
('Builder Prime CRM Playbook', 'Glossary — Team Terms & Shortcuts', 'Vocabulary specific to how the org talks about the pipeline. Bucket Cheat Sheet is Tristyn''s reference doc mapping Builder Prime internal statuses to plain-English bucket names. Speed to Lead is the automated multi-touch follow-up sequence after a new lead comes in. Nudges are automated SMS/email reminders.', '001-crm-playbook/index.html#glossary');

-- Individual CRM statuses (main pipeline) — so searching an exact status name jumps to Main Pipeline
insert into search_index (page, section_title, content, url) values
('Builder Prime CRM Playbook', 'New Lead – 1st Touch', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Speed to Lead 2 / 3 / 4', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Lead Set', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Lead Confirmed & Issued', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Demo', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Estimate Sent – 3 Nudges', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'E-Signature Sent', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Salesrep to Sign', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Job Sold', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Job Sold / Deposit Required', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Finance Pending → Deposit Invoice Sent', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Remeasure (Need to Book → Booked)', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Order & Cost (Ready → Ordered & Costed)', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Install (Received → Booked → In Progress)', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Incomplete Install', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Invoice (Complete / Incomplete) → Paid/Cash Out', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Job Closed / Customer', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'CWD Service', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Manufacture Service', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline'),
('Builder Prime CRM Playbook', 'Service Booked', 'CRM status in Main Pipeline.', '001-crm-playbook/index.html#main-pipeline');

-- Individual CRM statuses (branch & exit) — same reasoning
insert into search_index (page, section_title, content, url) values
('Builder Prime CRM Playbook', 'Lead Disqualified', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Supply Only', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Lead On Hold', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Lead Not Set – Rehash', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'No Show/Reset', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'No Demo', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Lead Cancelled/Reset', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Lead Cancel – Do Not Reset', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Demo/No Sale – Rehash (31-day auto-advance)', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Pending/Follow Up', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Pending (on e-sig expiry)', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Contract On Hold/Change Order', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Job Sold – Canceled', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Job Sold – Finance Rejected', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Job Lost', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit'),
('Builder Prime CRM Playbook', 'Job Cancelled/Declined', 'CRM status in Branch & Exit Statuses.', '001-crm-playbook/index.html#branch-exit');

-- Work Order Status — separate module from Lead/Project Status, confirmed manual-only (no automation panel)
insert into search_index (page, section_title, content, url) values
('Builder Prime CRM Playbook', 'Work Order Status', 'Work Order status field, distinct from Lead Status and Project Status. Flow: Unscheduled, Scheduled, In Progress, Complete, Invoiced, Paid, Cancelled. Confirmed manual dropdown only — no Work Order Status Automations panel exists in Admin, unlike Lead and Project status. Audited July 27.', '001-crm-playbook/index.html#work-order-status'),
('Builder Prime CRM Playbook', 'Unscheduled', 'Work Order status.', '001-crm-playbook/index.html#work-order-status'),
('Builder Prime CRM Playbook', 'Scheduled', 'Work Order status.', '001-crm-playbook/index.html#work-order-status'),
('Builder Prime CRM Playbook', 'In Progress (Work Order)', 'Work Order status.', '001-crm-playbook/index.html#work-order-status'),
('Builder Prime CRM Playbook', 'Invoiced', 'Work Order status.', '001-crm-playbook/index.html#work-order-status'),
('Builder Prime CRM Playbook', 'Paid', 'Work Order status.', '001-crm-playbook/index.html#work-order-status'),
('Builder Prime CRM Playbook', 'Cancelled (Work Order)', 'Work Order status.', '001-crm-playbook/index.html#work-order-status');

-- ============================================================
-- 002 — Org Chart
-- ============================================================
insert into search_index (page, section_title, content, url) values
('Org Chart', 'Org Chart', 'Full reporting structure across leadership, management, and team roles. Serge Rochon CEO. Marie Rochon COO. Gerry Cright Production Manager. Steve Dos Santos Project Manager and Service Manager. Tanya Terceira and Trystan Young Office Manager team, Administrator, Call Center and Lead Management with Seth Davison. HR Manager, Accounts Payable, Accounts Receivable. Gerry Cright and Tanya Terceira Health & Safety Manager. Trystin Young Tech Support. Serge Rochon and Gerry Cright Sales Manager over Outside Sales (Greg Flowers, Steve Stein, Cody Lamb, Tyler Heitzner, Tamara Gould) and Inside Sales. Serge Rochon Marketing Director over Nevaeh Rochon and Seth Davison Inside Advertising & Marketing, plus CGF Social Ads and Gooder Google Ads. Serge Rochon and Marie Rochon Finances. Rich Island Warehouse Coordinator and Service Tech. Installers: Jeff Reynolds, John Potton, John Vidito, Jody Gardiner, Brandon Bazley, Shane Grosse, Andrew Blair.', '002-org-chart/org-chart.html');

-- ============================================================
-- 003 — Marketing & Lead Source
-- ============================================================
insert into search_index (page, section_title, content, url) values
('Marketing & Lead Source', 'Overview', 'Documents all active and historical lead sources used by Complete Windows & Doors, identifies which are paid or unpaid, explains who manages each, and outlines how monthly advertising spend must be tracked in Builder Prime for accurate cost-per-lead reporting and budgeting. Navigation: Admin → Configure → Client Settings → Lead Sources.', '003-marketing-lead-source/index.html#overview'),
('Marketing & Lead Source', 'Monthly Spend Tracking', 'Key rules for keeping cost-per-lead reporting and ROI analysis accurate. All paid advertising sources must have monthly spend entered, updated consistently throughout the year. Annual contracts should be divided evenly across 12 months, or actual monthly amounts entered if costs fluctuate seasonally.', '003-marketing-lead-source/index.html#spend-tracking'),
('Marketing & Lead Source', 'Lead Source Reference Chart', 'All 28 tracked lead sources at a glance — paid/unpaid status, who manages it, whether cost tracking is required, and whether it can still be optimized. Includes Google Paid Search, Google LSA, Online Discovery, all managed by Gooder Marketing/Ryan Tomlinson.', '003-marketing-lead-source/index.html#source-reference'),
('Marketing & Lead Source', 'Lead Source Details', 'Full write-up per lead source — description, notes, and optimization angle. Google Paid Search managed by Gooder Marketing – Ryan Tomlinson, sponsored Google search ads for window/door replacement searches, one of the largest advertising budgets.', '003-marketing-lead-source/index.html#source-details'),
('Marketing & Lead Source', 'Monthly Checklist', 'Recurring monthly tasks grouped by area: update Builder Prime monthly lead source spends, verify advertising invoices and budgets, review cost-per-lead reporting, review Google ad performance with Ryan/Gooder Marketing, clarify Google Paid Search vs Online Discovery vs LSA, review website lead conversions, ChatGPT/SEO optimization, FAQ content.', '003-marketing-lead-source/index.html#monthly-checklist'),
('Marketing & Lead Source', 'Research & Improvement Areas', 'High priority recommended research and improvement areas: Google Ads clarification, Online Discovery clarification, ChatGPT optimization, Reddit visibility, Canada Post mail campaign pricing, Nextdoor setup/review.', '003-marketing-lead-source/index.html#research-areas');

-- ============================================================
-- 004 — Admin & Finance
-- ============================================================
insert into search_index (page, section_title, content, url) values
('Admin & Finance', 'Overview', 'Daily office operations, systems access, clock in/out, bookkeeping, insurance, and cash-out procedures — pulled from the live SharePoint Process Folder and HR Policies libraries. Note: some docs are 2023-era and still reference the old HCP (HouseCall Pro) system, not Builder Prime. Embedded reference: 2022 - HCP Questions.docx, unverified background on the HCP-era transition.', '004-admin-finance/index.html#overview'),
('Admin & Finance', 'Daily & Year-End Checklists', 'Admin Staff Daily Checklist: morning disarm alarm, lights/music on, check voicemails/emails/SMS boards, review to-do list, check lead sources overnight, address new leads in CRM. Midday: work emails in priority order, forward invoices to AP, apply AR payments, prep contracts. Weekly Checklist - Admin is embedded inline here.', '004-admin-finance/index.html#checklists'),
('Admin & Finance', 'Office & Systems', 'Mailbox handling, email confirmations, and the M365/phone system admin tools. General Mailbox is legacy from the old HCP system. Telephone: check main voicemail, collect name/number/details from messages. Filing Office Road Map is embedded inline here.', '004-admin-finance/index.html#office-systems'),
('Admin & Finance', 'Clock In & Clock Out (Builder Prime)', 'Installer time tracking for warehouse and jobsite, for payroll and job costing. Heading straight to a job: clock into Work & Job at the warehouse. Warehouse work first: clock into Work & Admin Task (General Labour).', '004-admin-finance/index.html#clock-in-out'),
('Admin & Finance', 'Bookkeeping & Payments', 'Accounts receivable/payable flow, payroll, and payment recording. AR: deposits mostly by credit/e-transfer, printed and recorded in CRM and client file, then manually recorded in Sage. AP: invoices arrive by email, printed.', '004-admin-finance/index.html#bookkeeping'),
('Admin & Finance', 'Insurance', 'Annual renewal and additional-insured certificate requests. Provider: Federated Insurance, contact Shawn Nugent. Check with shareholders in January on whether to shop the policy — get 3 quotes including current provider.', '004-admin-finance/index.html#insurance'),
('Admin & Finance', 'Cash Outs & Job Pouch', 'Preparing a completed job for cash-out and daily job-pouch logging. Trigger: job fully installed and paid in full. Assemble folder: Job Cost Breakdown, Signed Contract, Chargeback Sheet, Remeasure, Paid Invoices, Subcontractor info.', '004-admin-finance/index.html#cash-outs');

-- ============================================================
-- 005 — Sales
-- ============================================================
insert into search_index (page, section_title, content, url) values
('Sales', 'Overview', 'Organizes the sales role around the actual workday — what to check, what to do at each stage of an appointment, and what to say to a stale lead. A rep''s ownership starts once a lead is Lead Set. For automation detail see the CRM Playbook.', '005-sales/index.html#overview'),
('Sales', 'Daily Standard Guidelines', 'Habits that keep a rep''s book of appointments and follow-ups from going stale. Review To-Do list twice a day, morning and afternoon — overdue and due-today items sort to top. Phone and text are primary contact channels.', '005-sales/index.html#daily-guidelines'),
('Sales', 'Appointment Day Checklist', 'From Lead Set through Demo — what to actually do at each point, in order. Once appointment shows as Lead Set, confirm it with the client yourself. Send brochures per the auto-created To-Do.', '005-sales/index.html#appointment-checklist'),
('Sales', 'Closing the Sale', 'Estimate Sent through Job Sold — manual checkpoints easy to let slip because most of this stage looks automated. 3 automated SMS nudges plus 2 email nudges fire over following days, auto-advances to Demo/No Sale Rehash after 31 days.', '005-sales/index.html#closing-checklist'),
('Sales', 'Stale Lead Quick Reference (L-A-D-R)', 'Same process as the full script in the CRM Playbook, condensed for reps working their own Rehash and Demo/No Sale leads. Locate and assess leads inactive 1-2 months with all automated follow-ups already sent.', '005-sales/index.html#rehash-quickref'),
('Sales', 'Sales Associate Onboarding', 'Draft, not yet confirmed with Serge. First-two-weeks starting checklist for new sales hires built from what''s already documented elsewhere. Week 1: shadow a confirmed appointment through to demo with an existing rep, walk through the full pipeline glossary and stage map.', '005-sales/index.html#onboarding');

-- ============================================================
-- 006 — Scripts & Talk Tracks
-- ============================================================
insert into search_index (page, section_title, content, url) values
('Scripts & Talk Tracks', 'Overview', 'The talk-track reference — what to actually say on a call, voicemail, or text. Draft, confirm with Serge before treating any script as final. Scripts pulled from existing SharePoint templates.', '006-scripts-talk-tracks/index.html#overview'),
('Scripts & Talk Tracks', 'Inbound Call Handling', 'Full call flow from greeting to close, for any inbound call, new lead or existing client. Greeting script: thank you for calling Complete Windows & Doors, answer within 3 rings, smile before answering, introduce self and company.', '006-scripts-talk-tracks/index.html#inbound-call-handling'),
('Scripts & Talk Tracks', 'Lead Intake / Quote Request Follow-Up', 'For a customer who already reached out asking for a quote — booking the appointment and handling the common non-fit case of screen-repair-only requests.', '006-scripts-talk-tracks/index.html#lead-intake-script'),
('Scripts & Talk Tracks', 'Post-Estimate Follow-Up Call (CEI)', 'Called a few days after a sales rep''s estimate appointment, checks satisfaction via Customer Experience Index scoring and moves the client toward a decision. Integrated version folding structured CEI scoring into a warm conversational call.', '006-scripts-talk-tracks/index.html#post-estimate-cei'),
('Scripts & Talk Tracks', 'Stale Lead Rehash (L-A-D-R)', 'Full process, voicemail script, and follow-up text script live on the CRM Playbook since it is tied directly to the Rehash/Demo-No-Sale lead statuses. Linked here for completeness rather than duplicated.', '006-scripts-talk-tracks/index.html#stale-lead-rehash'),
('Scripts & Talk Tracks', 'Open Questions', 'Two drafts of the post-estimate script exist — an older shorter Office Admin Script for Post Estimate Appointment covers similar ground to the CEI version without the 1-10 scale or referral question. Confirm with Serge that CEI supersedes the older draft.', '006-scripts-talk-tracks/index.html#open-questions');

-- ============================================================
-- 007 — Production & Installation
-- ============================================================
insert into search_index (page, section_title, content, url) values
('Production & Installation', 'Overview', 'What happens once a contract is sold: remeasure, pre-install scheduling, the production hand-off, and change orders. Draft, confirm with Serge before treating any process as final.', '007-production-installation/index.html#overview'),
('Production & Installation', 'Production Buckets & Job Flow', 'Every job must have a Project Manager and a Remeasure Technician assigned, plus the pre-production bucket complete, before it moves into production. 2-week cash-out rule. Invoice tagging convention: customer last name plus project number. Before/after pictures via CompanyCam booked at time of remeasure. Inspection fees discussed and invoiced before booking. Remeasure Accuracy KPI tracked via Microsoft Form against a bonus allowance.', '007-production-installation/index.html#production-buckets-job-flow'),
('Production & Installation', 'Pre-Install Scheduling & Remeasure Booking', 'Admin sets up the job file and RM/install pouch, maps the remeasure route, books the remeasure in Builder Prime, sends order confirmations to production, and updates the material delivery date once invoice is received.', '007-production-installation/index.html#pre-install-scheduling'),
('Production & Installation', 'Remeasure Process (Post-Upload)', 'Scenario 1, no change order needed: Admin uploads RM to Builder Prime, status moves to Needs to be Ordered and Costed, file goes in the production tray. Scenario 2, change order needed: pouch marked with change-order indicator, status moves to Contract on Hold, sales rep runs the change order process, production returns the file to Admin once complete.', '007-production-installation/index.html#remeasure-process'),
('Production & Installation', 'Installation Time & Labor Baseline', 'Standardized baseline hours per opening for the Remeasure Technician — windows, doors, patio doors, capping, and common add-ons like headers, cut-outs, and stone sills. Formula: base window/door time plus drive time plus lunch/load-unload plus difficulty adjustment. Based on a 2-man crew, note Requires 3rd installer when needed.', '007-production-installation/index.html#install-time-labor'),
('Production & Installation', 'Change Order Process', 'A change order cannot be created after the final invoice is sent or paid — no exceptions. Change Order revises pricing/an element on the existing contract; Additional Scope adds new work to an already-sold contract. Roles: Salesperson creates/prices/sends for signature, Front Desk tracks and files, Production orders from the Needs to be Ordered and Costed bucket. Must be created and sent within 24 hours of discovery.', '007-production-installation/index.html#change-order-process'),
('Production & Installation', 'Installer Pouch & Daily Job Log', 'Amended back page of the installer pouch adds a mandatory daily job log completed same-day, used for issue tracking, cash-outs, and job close-out.', '007-production-installation/index.html#installer-pouch-daily-log'),
('Production & Installation', 'Open Questions', 'Three change order docs in circulation with a primary chosen for this page. Two versions of the Remeasure Process Workflow. Two labor-time reference docs (cheat sheet vs baseline checklist) with minor numbering differences. Final production bucket list not yet locked. Mitch''s BP role and subcontractor invoice cut-off date still open decisions.', '007-production-installation/index.html#open-questions');

-- ============================================================
-- 010 — HR & Onboarding
-- ============================================================
insert into search_index (page, section_title, content, url) values
('HR & Onboarding', 'Overview', 'New hire onboarding and HR reference material — company policies, the employee handbook, and HR/H&S role responsibilities, built from the SharePoint Human Resources library. Draft, confirm with Serge before treating any policy as final.', '010-hr/index.html#overview'),
('HR & Onboarding', 'New Hire Onboarding', 'No dedicated CompleteWD onboarding checklist or new-hire SOP exists yet. From the H&S Initial Planning Meeting minutes: onboarding paperwork signed at hire includes the OH&S Policy, Workplace Violence & Harassment Policy, Incident Reporting Procedure, and Emergency Response Procedures. Mandatory training for all employees: Workplace Health & Safety Awareness, WHMIS Training. The Recruiting SOP on file is a generic BTA Academy third-party template covering hiring/recruiting, not onboarding.', '010-hr/index.html#new-hire-onboarding'),
('HR & Onboarding', 'HR Reference Material', 'HR Manager and Health & Safety Manager role responsibilities. Employee Handbook (TT Draft, treated as primary): mission/values, Code of Ethics, Dress Code, Conflict of Interest and Workplace Relationships, Non-Solicitation, Whistleblower Policy, DEI, OHSA compliance, Anti-Harassment and Sexual Harassment policies. Standalone 2026 policies: Overtime Hours Banking (44hr/week threshold, banked Labour Day–Mar 31, 88hr cap, used Oct 1–May 31), Workplace Relationship & Conflict of Interest, Company Credit/Purchasing/Fuel Card Policy, Mobile Phone & Electronic Device Policy, Dress Code & Personal Hygiene Policy (work in progress), 2026 Master Employee Policy Acknowledgement Form, and the legacy 2022 Health and Safety Manual (WHMIS, PPE, fall protection, Return-to-Work Program).', '010-hr/index.html#hr-reference'),
('HR & Onboarding', 'Open Questions', 'Five overlapping Employee Handbook drafts in circulation — the TT Draft is the only one with placeholder text actually filled in, treated as primary here. Dress Code & Personal Hygiene Policy is filed as a generic "Work in Progress" doc, explicitly unfinished. The 2022 Health and Safety Manual (Version 1) likely needs a refresh alongside the 2026 policy wave. No dedicated new-hire onboarding SOP exists — same gap already flagged on the Sales page. Master Acknowledgement Form references several policies not found as standalone docs in this pull.', '010-hr/index.html#open-questions');

-- ============================================================
-- 008 — Service
-- ============================================================
insert into search_index (page, section_title, content, url) values
('Service', 'Overview', 'Service call routing, chargeable products, and the full Service Request Process from intake through digital filing. Draft, confirm with Serge before treating any process as final.', '008-service/index.html#overview'),
('Service', 'Service Call Routing', 'How an incoming service call gets taken, qualified, and handed to the Service Department. Admin identifies client and warranty coverage, takes pictures, creates a to-do for Service. Call Qualification Process Map: 24 hour initial contact SLA, 48 hour satisfaction follow-up, Customer Service Representative/Service Coordinator/Service Technician roles. Two service categories: Installation Services (within 3 years, Charge Back Installer) and Warranty Services (manufacturer covers parts, CWD covers labour), tracked on the service board.', '008-service/index.html#call-routing'),
('Service', 'Chargeable Products', 'When a service inspection becomes chargeable, current rate sheet, and inspection fee process for Property Management and Insurance companies. Chargeable Inspection fee schedule: In-Town Barrie $125, within 30km $200, 30-60km $300, 60-90km $400, 90-120km $500, credited toward approved replacement work. Service Rates 2026: 1 Man $90/hr, 2 Man $160/hr plus half-day/day rates by KM band. Inspection Fee Process for PM & Insurance: $300 within 30km, $400 30-60km, $500 60-90km, credited back on final invoice if client proceeds with supply & install.', '008-service/index.html#chargeable-products'),
('Service', 'Service Request Process', 'Full 11-step workflow: 1 Intake & Processing (Front Administration collects client info, sets expectations), 2 Client Review & Setup (Service Coordinator reviews warranty, determines Manufacturer/CWD/Rework/Chargeable service type, creates Work Order), 3 Parts Ordering (identify part, check inventory, order via Insight Pro or email, verify confirmation), 4 Client Follow-up Communication waiting for part, 5 Parts Receiving (verify and match packing slip), 6 Parts Scheduling & Tech Prep (route planning, client scheduling call, technician docket), 7 Work Preparation (technician verifies parts before departure), 8 Onsite Execution & Client Sign-off, 9 Work Order Logging & Close Out, 10 Re-Work & Follow-up, 11 Work Order Scanning & Digital Filing (scan, upload to Builder Prime Service Confirmations folder, file or shred).', '008-service/index.html#request-process'),
('Service', 'Open Questions', 'Entire Service Request Process series is unconfirmed draft (all filenamed DRAFT HOW TO). Steps 5 and 6 exist despite an initial search missing them. Two versions of Step 2 Client Review & Setup (Service Coordinator vs Production perspective). Rate sheet conflict between CWD Service Rates 2026 (authoritative) and the Feb 2025 Service Charge Breakdown. Inspection fee schedule conflict between the Admin/Technician chargeable inspection docs and the PM & Insurance inspection fee process doc. Legacy duplicate of the Service departement HOW TO under an old HR path, still HCP-era language. Three differently-worded framings of Service Call Routing not fully aligned on SLA numbers and role names.', '008-service/index.html#open-questions');

-- ============================================================
-- 009 — Ordering & Vendor
-- ============================================================
insert into search_index (page, section_title, content, url) values
('Ordering & Vendor', 'Overview', 'How a measured project moves from Ready to Order through Job Costing in Builder Prime, how manufacturer credits get requested and tracked to close, how vendor accounts/POs work, and how overstock inventory gets resold. Draft, confirm with Serge before treating any process as final.', '009-ordering-vendor/index.html#overview'),
('Ordering & Vendor', 'Ordering & Job Costing Chain', 'Five-doc sequence: 1 Initial File Review Prior to Ordering (verify signed contract, deposit, remeasure documentation, Builder Prime match before a file leaves the Ready to Order bin). 2 Measurement Prep for Ordering (update manufacturer quoting software e.g. KV DaVinci, review every line item, flag costing red flags, generate the Dealer Estimate Detail Report). 2 Special Order Items (identify and order job-specific items outside the main manufacturer order, PO format Client Last Name plus job number, template-required trim delays). 3 Job Costing Excel Spreadsheet (Job Cost Breakdown template, Labor Breakdown tab, naming convention LAST NAME ESTIMATE NUMBER MONTH YEAR). 4 Job Costing CRM Builder Prime (enter labor as Sub Cost, material cost, miscellaneous fee, sales commission, create Estimated baseline, move file to final ordering review).', '009-ordering-vendor/index.html#ordering-job-costing'),
('Ordering & Vendor', 'Manufacturer Credits', 'Process for requesting and tracking manufacturer credits (damaged product, incorrect order, warranty issue) through to close. All credits must be documented in Builder Prime with a Client Profile note and a follow-up to-do due 1 week out; if unresponsive after 3 days, daily follow-up begins, then a 3-day follow-up cycle until received. Real example from Production Minutes: KV credit for the TOWNS project, tracked from initial follow-up through confirmed receipt.', '009-ordering-vendor/index.html#manufacturer-credits'),
('Ordering & Vendor', 'Vendor Accounts & Purchase Orders', 'Per-vendor credit/account applications filed under Operations/Vendors and Vendor Statements & Reports (e.g. VDK Group, Gentek) — CWD as applicant, standard Net 30 terms with 2%/month overdue service charge, trade references including KV Custom Windows & Doors, Simcoe Building Centre, and Door Hardware Supply. PO format when CWD orders: Client Last Name plus six-digit job number. Net 30 plus PO-numbered invoicing convention seen consistently across vendor correspondence (e.g. Kaycan Ltd.) and restoration-trade vendor relationships.', '009-ordering-vendor/index.html#vendor-accounts'),
('Ordering & Vendor', 'Overstock Management', 'No finalized written SOP yet — reconstructed from four Production Meeting minutes/agendas, May 2025 through July 2026. Overstock windows/doors sold via Facebook Marketplace and Kijiji (Marketplace for smaller items, Kijiji for larger). 2026 decisions: contractor-focused inventory listings, Facebook/contractor group marketing, aged inventory flagged for donation/disposal, process being restructured by department. Cash-handling process (proceeds kept in an envelope for company events) flagged in 2025 with unresolved bookkeeping implications — petty cash, receipts, write-offs.', '009-ordering-vendor/index.html#overstock'),
('Ordering & Vendor', 'Open Questions', 'Entire Ordering & Job Costing series is unconfirmed draft (all filenamed DRAFT HOW TO). Two docs both numbered step 2 (Measurement Prep for Ordering and Special Order Items) — likely a filing slip, needs Serge confirmation on correct order. 2026 Production Meetings twice flag a job-costing accuracy gap: trim cost in Builder Prime coming in lower than the Excel Job Cost Breakdown. No master vendor list exists — account/credit info scattered per-vendor across folders. Overstock/Kijiji process still being actively reworked (explicitly called a re-do in July 2026) with no finalized SOP, and its 2025 cash-handling policy gap was never revisited.', '009-ordering-vendor/index.html#open-questions');
