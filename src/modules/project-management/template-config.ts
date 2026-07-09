import type { MemberRole } from './types'

export const DEFAULT_PROJECT_TEMPLATE = 'Software Development'

export type TemplateIconKey =
  | 'briefcase'
  | 'calendar'
  | 'code'
  | 'dollar'
  | 'file'
  | 'git'
  | 'layers'
  | 'shield'
  | 'users'
  | 'zap'

export type TemplateFieldInput = 'text' | 'textarea' | 'url' | 'select' | 'multi'

export type TemplateFieldBinding =
  | 'templateData'
  | 'techStack.frontend'
  | 'techStack.backend'
  | 'techStack.database'
  | 'techStack.other'
  | 'repository.gitUrl'
  | 'repository.devUrl'
  | 'repository.testingUrl'
  | 'repository.productionUrl'

export type TemplateFieldConfig = {
  key: string
  label: string
  placeholder: string
  input?: TemplateFieldInput
  binding?: TemplateFieldBinding
  options?: readonly string[]
  required?: boolean
}

export type TemplateFieldSection = {
  title: string
  description?: string
  fields: readonly TemplateFieldConfig[]
}

export type TemplateFieldsStep = {
  type: 'fields'
  id: string
  label: string
  title: string
  hint: string
  icon: TemplateIconKey
  sections: readonly TemplateFieldSection[]
}

export type TemplatePlanningStep = {
  type: 'planning'
  id: string
  label: string
  title: string
  hint: string
  icon: TemplateIconKey
  phaseTitle: string
  phaseDescription: string
  phaseNameLabel: string
  phaseNamePlaceholder: string
  sprintTitle: string
  sprintGoalLabel: string
  sprintGoalPlaceholder: string
}

export type TemplateTimelineStep = {
  type: 'timeline'
  id: string
  label: string
  title: string
  hint: string
  icon: TemplateIconKey
  startLabel: string
  endLabel: string
  actualEndLabel: string
  deadlineLabel: string
}

export type TemplateTeamStep = {
  type: 'team'
  id: string
  label: string
  title: string
  hint: string
  icon: TemplateIconKey
  leadershipTitle: string
  leadershipDescription: string
  managerLabel: string
  leadLabel: string
  memberTitle: string
  memberDescription: string
  memberPickerLabel: string
  defaultRole: MemberRole
  roleOptions?: readonly MemberRole[]
  requireMembers?: boolean
}

export type TemplateBudgetStep = {
  type: 'budget'
  id: string
  label: string
  title: string
  hint: string
  icon: TemplateIconKey
  totalLabel: string
  developmentLabel: string
  resourceLabel: string
  remainingLabel: string
  requireTotal?: boolean
}

export type TemplateReviewStep = {
  type: 'review'
  id: string
  label: string
  title: string
  hint: string
  icon: TemplateIconKey
}

export type TemplateWizardStep =
  | TemplateFieldsStep
  | TemplatePlanningStep
  | TemplateTimelineStep
  | TemplateTeamStep
  | TemplateBudgetStep
  | TemplateReviewStep

export type ProjectTemplateConfig = {
  name: string
  description: string
  primaryActionLabel: string
  approvalActionLabel: string
  steps: readonly TemplateWizardStep[]
}

const frontendOptions = ['React', 'Angular', 'Vue', 'Flutter', 'Android', 'iOS', 'Next.js', 'Svelte']
const backendOptions = ['Spring Boot', 'Node JS', 'FastAPI', '.NET', 'Django', 'Laravel', 'Go', 'Ruby on Rails']
const databaseOptions = ['PostgreSQL', 'MySQL', 'MongoDB', 'Oracle', 'Redis', 'SQLite', 'Cassandra']
const devopsOptions = ['Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Firebase', 'Terraform', 'Jenkins']

const softwareRoleOptions: readonly MemberRole[] = ['Project Manager', 'Team Lead', 'Developer', 'QA Engineer', 'UI/UX Designer', 'DevOps Engineer', 'Business Analyst', 'Stakeholder']
const marketingRoleOptions: readonly MemberRole[] = ['Campaign Manager', 'Marketing Lead', 'Business Analyst', 'Stakeholder']
const hrRoleOptions: readonly MemberRole[] = ['Recruiter', 'HR Partner', 'Project Manager', 'Stakeholder']
const financeRoleOptions: readonly MemberRole[] = ['Finance Analyst', 'Project Manager', 'Business Analyst', 'Stakeholder']
const salesRoleOptions: readonly MemberRole[] = ['Sales Manager', 'Account Executive', 'Business Analyst', 'Stakeholder']
const designRoleOptions: readonly MemberRole[] = ['UI/UX Designer', 'Designer', 'Project Manager', 'Stakeholder']
const operationsRoleOptions: readonly MemberRole[] = ['Operations Lead', 'Operations Analyst', 'Project Manager', 'Stakeholder']

export const legacyTemplateAliases: Record<string, string> = {
  'Blank Project': 'Software Development',
  Implementation: 'Software Development',
  'Marketing Campaign': 'Marketing',
  'Product Launch': 'Marketing',
  'Internal Operations': 'Operations',
}

export const projectTemplateConfigs: Record<string, ProjectTemplateConfig> = {
  'Software Development': {
    name: 'Software Development',
    description: 'Engineering workflow with stack, repositories, environments, sprints, team, timeline and budget.',
    primaryActionLabel: 'Create project',
    approvalActionLabel: 'Send for approval',
    steps: [
      {
        type: 'fields',
        id: 'software-stack',
        label: 'Technology Stack',
        title: 'Technology Stack',
        hint: 'Frameworks, database and infrastructure choices',
        icon: 'code',
        sections: [
          {
            title: 'Technology Stack',
            description: 'Select the engineering stack for this project.',
            fields: [
              { key: 'frontendFramework', label: 'Frontend Framework', placeholder: 'Select frontend framework...', input: 'multi', binding: 'techStack.frontend', options: frontendOptions, required: true },
              { key: 'backendFramework', label: 'Backend Framework', placeholder: 'Select backend framework...', input: 'multi', binding: 'techStack.backend', options: backendOptions, required: true },
              { key: 'database', label: 'Database', placeholder: 'Select database...', input: 'multi', binding: 'techStack.database', options: databaseOptions, required: true },
              { key: 'infrastructureDevops', label: 'Infrastructure / DevOps', placeholder: 'Select infrastructure...', input: 'multi', binding: 'techStack.other', options: devopsOptions, required: true },
            ],
          },
        ],
      },
      {
        type: 'fields',
        id: 'software-repository',
        label: 'Repository',
        title: 'Repository & Environment',
        hint: 'Codebase and environment URLs',
        icon: 'git',
        sections: [
          {
            title: 'Repository & Environment',
            fields: [
              { key: 'gitRepositoryUrl', label: 'Git Repository URL', placeholder: 'https://github.com/org/repo', input: 'url', binding: 'repository.gitUrl', required: true },
              { key: 'developmentUrl', label: 'Development URL', placeholder: 'https://dev.example.com', input: 'url', binding: 'repository.devUrl', required: true },
              { key: 'qaUrl', label: 'QA URL', placeholder: 'https://qa.example.com', input: 'url', binding: 'repository.testingUrl', required: true },
              { key: 'productionUrl', label: 'Production URL', placeholder: 'https://app.example.com', input: 'url', binding: 'repository.productionUrl', required: true },
            ],
          },
        ],
      },
      {
        type: 'planning',
        id: 'software-sprints',
        label: 'Sprint Planning',
        title: 'Sprint Planning',
        hint: 'Project phases and sprint cadence',
        icon: 'layers',
        phaseTitle: 'Project phases',
        phaseDescription: 'Break the build into delivery phases with owners and dates.',
        phaseNameLabel: 'Phase name',
        phaseNamePlaceholder: 'Discovery, Build, UAT',
        sprintTitle: 'Sprint configuration',
        sprintGoalLabel: 'Sprint goal',
        sprintGoalPlaceholder: 'Goal for this sprint...',
      },
      {
        type: 'team',
        id: 'software-team',
        label: 'Team Members',
        title: 'Team Members',
        hint: 'Engineering ownership and delivery team',
        icon: 'users',
        leadershipTitle: 'Leadership',
        leadershipDescription: 'Manager and technical lead for this project.',
        managerLabel: 'Project manager',
        leadLabel: 'Team lead',
        memberTitle: 'Team members',
        memberDescription: 'Add each engineer with role, joined date, responsibilities and permissions.',
        memberPickerLabel: 'Team member',
        defaultRole: 'Developer',
        roleOptions: softwareRoleOptions,
        requireMembers: true,
      },
      {
        type: 'timeline',
        id: 'software-timeline',
        label: 'Timeline',
        title: 'Timeline',
        hint: 'Project dates and deadline type',
        icon: 'calendar',
        startLabel: 'Start date',
        endLabel: 'Expected end date',
        actualEndLabel: 'Actual end date',
        deadlineLabel: 'Deadline type',
      },
      {
        type: 'budget',
        id: 'software-budget',
        label: 'Budget',
        title: 'Budget',
        hint: 'Estimated development and resource costs',
        icon: 'dollar',
        totalLabel: 'Estimated budget ($)',
        developmentLabel: 'Development cost ($)',
        resourceLabel: 'Resource cost ($)',
        remainingLabel: 'Remaining',
        requireTotal: true,
      },
      {
        type: 'review',
        id: 'software-review',
        label: 'Review & Create',
        title: 'Review & Create',
        hint: 'Confirm engineering details before creating the project',
        icon: 'shield',
      },
    ],
  },
  Marketing: {
    name: 'Marketing',
    description: 'Campaign workflow with setup, tools, assets, campaign timeline, team and budget.',
    primaryActionLabel: 'Launch campaign',
    approvalActionLabel: 'Send for launch approval',
    steps: [
      {
        type: 'fields',
        id: 'marketing-campaign',
        label: 'Campaign Setup',
        title: 'Campaign Setup',
        hint: 'Campaign type, goal, audience and channels',
        icon: 'briefcase',
        sections: [
          {
            title: 'Campaign Setup',
            fields: [
              { key: 'campaignType', label: 'Campaign Type', placeholder: 'Select campaign type...', input: 'select', options: ['Brand Awareness', 'Lead Generation', 'Product Launch', 'Event', 'Retention', 'Partner Campaign'], required: true },
              { key: 'campaignGoal', label: 'Campaign Goal', placeholder: 'Describe the campaign goal...', input: 'textarea', required: true },
              { key: 'targetAudience', label: 'Target Audience', placeholder: 'ICP, segment or audience cohort', input: 'text', required: true },
              { key: 'marketingChannels', label: 'Marketing Channels', placeholder: 'Select marketing channels...', input: 'multi', options: ['Email', 'Paid Search', 'Paid Social', 'Organic Social', 'SEO', 'Webinar', 'Events', 'Partner'], required: true },
            ],
          },
        ],
      },
      {
        type: 'fields',
        id: 'marketing-tools',
        label: 'Marketing Tools',
        title: 'Marketing Tools',
        hint: 'Platforms used to execute and measure the campaign',
        icon: 'zap',
        sections: [
          {
            title: 'Marketing Tools',
            fields: [
              { key: 'emailPlatform', label: 'Email Platform', placeholder: 'Mailchimp, HubSpot, Marketo...', input: 'text', required: true },
              { key: 'analyticsTool', label: 'Analytics Tool', placeholder: 'GA4, Mixpanel, Power BI...', input: 'text', required: true },
              { key: 'advertisingPlatform', label: 'Advertising Platform', placeholder: 'Google Ads, Meta Ads, LinkedIn...', input: 'text', required: true },
              { key: 'crmIntegration', label: 'CRM Integration', placeholder: 'Salesforce, HubSpot CRM...', input: 'text', required: true },
            ],
          },
        ],
      },
      {
        type: 'fields',
        id: 'marketing-assets',
        label: 'Assets',
        title: 'Assets',
        hint: 'Campaign destinations and asset references',
        icon: 'file',
        sections: [
          {
            title: 'Assets',
            fields: [
              { key: 'landingPageUrl', label: 'Landing Page URL', placeholder: 'https://example.com/campaign', input: 'url', required: true },
              { key: 'assetLibrary', label: 'Asset Library', placeholder: 'Drive, DAM or folder link', input: 'url', required: true },
              { key: 'utmTemplate', label: 'UTM Template', placeholder: 'utm_source={{channel}}&utm_campaign={{name}}', input: 'textarea', required: true },
              { key: 'liveCampaignUrl', label: 'Live Campaign URL', placeholder: 'https://example.com/live-campaign', input: 'url' },
            ],
          },
        ],
      },
      {
        type: 'timeline',
        id: 'marketing-timeline',
        label: 'Campaign Timeline',
        title: 'Campaign Timeline',
        hint: 'Campaign planning, launch and wrap-up dates',
        icon: 'calendar',
        startLabel: 'Planning start date',
        endLabel: 'Campaign end date',
        actualEndLabel: 'Actual close date',
        deadlineLabel: 'Launch urgency',
      },
      {
        type: 'team',
        id: 'marketing-team',
        label: 'Team Members',
        title: 'Team Members',
        hint: 'Campaign owners and contributors',
        icon: 'users',
        leadershipTitle: 'Campaign ownership',
        leadershipDescription: 'Marketing owner and execution lead.',
        managerLabel: 'Campaign manager',
        leadLabel: 'Marketing lead',
        memberTitle: 'Team members',
        memberDescription: 'Add campaign contributors with role and responsibilities.',
        memberPickerLabel: 'Contributor',
        defaultRole: 'Campaign Manager',
        roleOptions: marketingRoleOptions,
        requireMembers: true,
      },
      {
        type: 'budget',
        id: 'marketing-budget',
        label: 'Budget',
        title: 'Budget',
        hint: 'Campaign spend and resource allocation',
        icon: 'dollar',
        totalLabel: 'Campaign budget ($)',
        developmentLabel: 'Media spend ($)',
        resourceLabel: 'Creative / resource cost ($)',
        remainingLabel: 'Unallocated',
        requireTotal: true,
      },
      {
        type: 'review',
        id: 'marketing-review',
        label: 'Review & Launch',
        title: 'Review & Launch',
        hint: 'Confirm campaign setup before launch',
        icon: 'shield',
      },
    ],
  },
  'Human Resources': {
    name: 'Human Resources',
    description: 'HR workflow with systems, documents, recruitment timeline, recruiters and hiring budget.',
    primaryActionLabel: 'Create HR project',
    approvalActionLabel: 'Send for approval',
    steps: [
      {
        type: 'fields',
        id: 'hr-systems',
        label: 'HR Systems',
        title: 'HR Systems',
        hint: 'Core HR platforms used by the project',
        icon: 'briefcase',
        sections: [
          {
            title: 'HR Systems',
            fields: [
              { key: 'hrmsPlatform', label: 'HRMS Platform', placeholder: 'Workday, Darwinbox, BambooHR...', input: 'text', required: true },
              { key: 'applicantTrackingSystem', label: 'Applicant Tracking System', placeholder: 'Greenhouse, Lever, Zoho Recruit...', input: 'text', required: true },
              { key: 'payrollSystem', label: 'Payroll System', placeholder: 'ADP, RazorpayX Payroll...', input: 'text', required: true },
              { key: 'learningManagementSystem', label: 'Learning Management System', placeholder: 'Moodle, Docebo, TalentLMS...', input: 'text', required: true },
            ],
          },
        ],
      },
      {
        type: 'fields',
        id: 'hr-documents',
        label: 'Documents',
        title: 'Documents',
        hint: 'HR document links and templates',
        icon: 'file',
        sections: [
          {
            title: 'Documents',
            fields: [
              { key: 'employeeHandbook', label: 'Employee Handbook', placeholder: 'Handbook link or file reference', input: 'url', required: true },
              { key: 'offerLetterTemplate', label: 'Offer Letter Template', placeholder: 'Template link', input: 'url', required: true },
              { key: 'onboardingChecklist', label: 'Onboarding Checklist', placeholder: 'Checklist link', input: 'url', required: true },
              { key: 'policyDocuments', label: 'Policy Documents', placeholder: 'Policy folder link', input: 'url', required: true },
            ],
          },
        ],
      },
      {
        type: 'timeline',
        id: 'hr-timeline',
        label: 'Recruitment Timeline',
        title: 'Recruitment Timeline',
        hint: 'Hiring start, target and completion dates',
        icon: 'calendar',
        startLabel: 'Recruitment start date',
        endLabel: 'Target hire date',
        actualEndLabel: 'Actual close date',
        deadlineLabel: 'Hiring urgency',
      },
      {
        type: 'team',
        id: 'hr-recruiters',
        label: 'Assigned Recruiters',
        title: 'Assigned Recruiters',
        hint: 'Recruiting owners and interview coordinators',
        icon: 'users',
        leadershipTitle: 'Recruitment ownership',
        leadershipDescription: 'Lead recruiter and hiring coordinator.',
        managerLabel: 'Lead recruiter',
        leadLabel: 'Recruiting coordinator',
        memberTitle: 'Assigned recruiters',
        memberDescription: 'Add recruiters with hiring responsibilities and permissions.',
        memberPickerLabel: 'Recruiter',
        defaultRole: 'Recruiter',
        roleOptions: hrRoleOptions,
        requireMembers: true,
      },
      {
        type: 'budget',
        id: 'hr-budget',
        label: 'Hiring Budget',
        title: 'Hiring Budget',
        hint: 'Recruitment spend and hiring cost plan',
        icon: 'dollar',
        totalLabel: 'Hiring budget ($)',
        developmentLabel: 'Agency / sourcing cost ($)',
        resourceLabel: 'Assessment / onboarding cost ($)',
        remainingLabel: 'Remaining',
        requireTotal: true,
      },
      {
        type: 'review',
        id: 'hr-review',
        label: 'Review & Create',
        title: 'Review & Create',
        hint: 'Confirm HR setup before creating the project',
        icon: 'shield',
      },
    ],
  },
  Finance: {
    name: 'Finance',
    description: 'Finance workflow with finance systems, compliance documents, financial timeline, budget allocation and finance team.',
    primaryActionLabel: 'Create project',
    approvalActionLabel: 'Send for approval',
    steps: [
      {
        type: 'fields',
        id: 'finance-systems',
        label: 'Finance Systems',
        title: 'Finance Systems',
        hint: 'Accounting, expense and reporting stack',
        icon: 'briefcase',
        sections: [
          {
            title: 'Finance Systems',
            fields: [
              { key: 'erp', label: 'ERP', placeholder: 'SAP, Oracle, Microsoft Dynamics...', input: 'text', required: true },
              { key: 'accountingSoftware', label: 'Accounting Software', placeholder: 'QuickBooks, Tally, NetSuite...', input: 'text', required: true },
              { key: 'expenseManagementTool', label: 'Expense Management Tool', placeholder: 'Expensify, Zoho Expense...', input: 'text', required: true },
              { key: 'reportingPlatform', label: 'Reporting Platform', placeholder: 'Power BI, Tableau, Looker...', input: 'text', required: true },
            ],
          },
        ],
      },
      {
        type: 'fields',
        id: 'finance-documents',
        label: 'Documents',
        title: 'Documents',
        hint: 'Financial controls and compliance references',
        icon: 'file',
        sections: [
          {
            title: 'Documents',
            fields: [
              { key: 'chartOfAccounts', label: 'Chart of Accounts', placeholder: 'Chart of accounts link', input: 'url', required: true },
              { key: 'approvalWorkflow', label: 'Approval Workflow', placeholder: 'Workflow diagram or policy link', input: 'url', required: true },
              { key: 'auditFolder', label: 'Audit Folder', placeholder: 'Audit folder link', input: 'url', required: true },
              { key: 'complianceDocuments', label: 'Compliance Documents', placeholder: 'Compliance folder link', input: 'url', required: true },
            ],
          },
        ],
      },
      {
        type: 'timeline',
        id: 'finance-timeline',
        label: 'Financial Timeline',
        title: 'Financial Timeline',
        hint: 'Planning, allocation and close dates',
        icon: 'calendar',
        startLabel: 'Planning start date',
        endLabel: 'Financial close date',
        actualEndLabel: 'Actual close date',
        deadlineLabel: 'Reporting deadline type',
      },
      {
        type: 'budget',
        id: 'finance-budget',
        label: 'Budget Allocation',
        title: 'Budget Allocation',
        hint: 'Allocated budget and committed costs',
        icon: 'dollar',
        totalLabel: 'Budget allocation ($)',
        developmentLabel: 'Committed cost ($)',
        resourceLabel: 'Reserve / contingency ($)',
        remainingLabel: 'Available',
        requireTotal: true,
      },
      {
        type: 'team',
        id: 'finance-team',
        label: 'Finance Team',
        title: 'Finance Team',
        hint: 'Finance owners and approvers',
        icon: 'users',
        leadershipTitle: 'Finance ownership',
        leadershipDescription: 'Finance manager and approval lead.',
        managerLabel: 'Finance manager',
        leadLabel: 'Approval lead',
        memberTitle: 'Finance team',
        memberDescription: 'Add finance contributors with responsibilities and permissions.',
        memberPickerLabel: 'Finance member',
        defaultRole: 'Finance Analyst',
        roleOptions: financeRoleOptions,
        requireMembers: true,
      },
      {
        type: 'review',
        id: 'finance-review',
        label: 'Review & Create',
        title: 'Review & Create',
        hint: 'Confirm finance setup before creating the project',
        icon: 'shield',
      },
    ],
  },
  Sales: {
    name: 'Sales',
    description: 'Sales workflow with sales tools, documents, timeline, sales team and revenue target.',
    primaryActionLabel: 'Create sales project',
    approvalActionLabel: 'Send for approval',
    steps: [
      {
        type: 'fields',
        id: 'sales-tools',
        label: 'Sales Tools',
        title: 'Sales Tools',
        hint: 'Revenue workflow tools and platforms',
        icon: 'briefcase',
        sections: [
          {
            title: 'Sales Tools',
            fields: [
              { key: 'crmPlatform', label: 'CRM Platform', placeholder: 'Salesforce, HubSpot, Zoho...', input: 'text', required: true },
              { key: 'outreachTool', label: 'Outreach Tool', placeholder: 'Outreach, Salesloft, Apollo...', input: 'text', required: true },
              { key: 'proposalTool', label: 'Proposal Tool', placeholder: 'PandaDoc, Qwilr, Google Docs...', input: 'text', required: true },
              { key: 'contractManagement', label: 'Contract Management', placeholder: 'DocuSign, Ironclad, CLM...', input: 'text', required: true },
            ],
          },
        ],
      },
      {
        type: 'fields',
        id: 'sales-documents',
        label: 'Documents',
        title: 'Documents',
        hint: 'Opportunity, proposal and contract references',
        icon: 'file',
        sections: [
          {
            title: 'Documents',
            fields: [
              { key: 'crmRecord', label: 'CRM Record', placeholder: 'CRM opportunity URL', input: 'url', required: true },
              { key: 'proposalLink', label: 'Proposal Link', placeholder: 'Proposal URL', input: 'url', required: true },
              { key: 'salesPlaybook', label: 'Sales Playbook', placeholder: 'Playbook link', input: 'url', required: true },
              { key: 'signedContract', label: 'Signed Contract', placeholder: 'Signed contract link', input: 'url', required: true },
            ],
          },
        ],
      },
      {
        type: 'timeline',
        id: 'sales-timeline',
        label: 'Sales Timeline',
        title: 'Sales Timeline',
        hint: 'Opportunity start, close target and actual close',
        icon: 'calendar',
        startLabel: 'Opportunity start date',
        endLabel: 'Target close date',
        actualEndLabel: 'Actual close date',
        deadlineLabel: 'Deal urgency',
      },
      {
        type: 'team',
        id: 'sales-team',
        label: 'Sales Team',
        title: 'Sales Team',
        hint: 'Sales owner and deal team',
        icon: 'users',
        leadershipTitle: 'Sales ownership',
        leadershipDescription: 'Account owner and deal lead.',
        managerLabel: 'Sales manager',
        leadLabel: 'Deal lead',
        memberTitle: 'Sales team',
        memberDescription: 'Add sales contributors with responsibilities and permissions.',
        memberPickerLabel: 'Sales member',
        defaultRole: 'Account Executive',
        roleOptions: salesRoleOptions,
        requireMembers: true,
      },
      {
        type: 'budget',
        id: 'sales-revenue',
        label: 'Revenue Target',
        title: 'Revenue Target',
        hint: 'Target revenue, pipeline value and expected margin',
        icon: 'dollar',
        totalLabel: 'Revenue target ($)',
        developmentLabel: 'Pipeline value ($)',
        resourceLabel: 'Expected margin ($)',
        remainingLabel: 'Gap to target',
        requireTotal: true,
      },
      {
        type: 'review',
        id: 'sales-review',
        label: 'Review & Create',
        title: 'Review & Create',
        hint: 'Confirm sales setup before creating the project',
        icon: 'shield',
      },
    ],
  },
  'Design / UI-UX': {
    name: 'Design / UI-UX',
    description: 'Product design workflow with design tools, assets, timeline, designers and review.',
    primaryActionLabel: 'Create project',
    approvalActionLabel: 'Send for approval',
    steps: [
      {
        type: 'fields',
        id: 'design-tools',
        label: 'Design Tools',
        title: 'Design Tools',
        hint: 'Design, prototype, handoff and asset platforms',
        icon: 'briefcase',
        sections: [
          {
            title: 'Design Tools',
            fields: [
              { key: 'designTool', label: 'Design Tool', placeholder: 'Figma, Sketch, Adobe XD...', input: 'text', required: true },
              { key: 'prototypeTool', label: 'Prototype Tool', placeholder: 'Figma Prototype, ProtoPie...', input: 'text', required: true },
              { key: 'handoffTool', label: 'Handoff Tool', placeholder: 'Zeplin, Figma Dev Mode...', input: 'text', required: true },
              { key: 'assetLibrary', label: 'Asset Library', placeholder: 'Design asset library link', input: 'url', required: true },
            ],
          },
        ],
      },
      {
        type: 'fields',
        id: 'design-assets',
        label: 'Design Assets',
        title: 'Design Assets',
        hint: 'Design source and handoff references',
        icon: 'file',
        sections: [
          {
            title: 'Design Assets',
            fields: [
              { key: 'figmaFile', label: 'Figma File', placeholder: 'Figma file URL', input: 'url', required: true },
              { key: 'componentLibrary', label: 'Component Library', placeholder: 'Component library URL', input: 'url', required: true },
              { key: 'styleGuide', label: 'Style Guide', placeholder: 'Style guide URL', input: 'url', required: true },
              { key: 'handoffDocumentation', label: 'Handoff Documentation', placeholder: 'Handoff documentation URL', input: 'url', required: true },
            ],
          },
        ],
      },
      {
        type: 'timeline',
        id: 'design-timeline',
        label: 'Design Timeline',
        title: 'Design Timeline',
        hint: 'Design start, review target and completion',
        icon: 'calendar',
        startLabel: 'Design start date',
        endLabel: 'Handoff target date',
        actualEndLabel: 'Actual handoff date',
        deadlineLabel: 'Review deadline type',
      },
      {
        type: 'team',
        id: 'design-team',
        label: 'Designers',
        title: 'Designers',
        hint: 'Design owner and contributors',
        icon: 'users',
        leadershipTitle: 'Design ownership',
        leadershipDescription: 'Design lead and reviewer.',
        managerLabel: 'Design lead',
        leadLabel: 'Review lead',
        memberTitle: 'Designers',
        memberDescription: 'Add designers with responsibilities and permissions.',
        memberPickerLabel: 'Designer',
        defaultRole: 'UI/UX Designer',
        roleOptions: designRoleOptions,
        requireMembers: true,
      },
      {
        type: 'review',
        id: 'design-review',
        label: 'Create Project',
        title: 'Review',
        hint: 'Review design setup before creating the project',
        icon: 'shield',
      },
    ],
  },
  Operations: {
    name: 'Operations',
    description: 'Operations workflow with systems, process documents, timeline, team and budget.',
    primaryActionLabel: 'Create project',
    approvalActionLabel: 'Send for approval',
    steps: [
      {
        type: 'fields',
        id: 'operations-systems',
        label: 'Operations Systems',
        title: 'Operations Systems',
        hint: 'Operational platforms and reporting tools',
        icon: 'briefcase',
        sections: [
          {
            title: 'Operations Systems',
            fields: [
              { key: 'operationsPlatform', label: 'Operations Platform', placeholder: 'Operations management platform', input: 'text', required: true },
              { key: 'inventorySystem', label: 'Inventory System', placeholder: 'Inventory platform', input: 'text', required: true },
              { key: 'vendorPortal', label: 'Vendor Portal', placeholder: 'Vendor portal URL or name', input: 'text', required: true },
              { key: 'reportingTool', label: 'Reporting Tool', placeholder: 'Power BI, Tableau, Looker...', input: 'text', required: true },
            ],
          },
        ],
      },
      {
        type: 'fields',
        id: 'operations-documents',
        label: 'Documents',
        title: 'Documents',
        hint: 'SOPs, vendor contracts, process maps and compliance references',
        icon: 'file',
        sections: [
          {
            title: 'Documents',
            fields: [
              { key: 'sop', label: 'SOP', placeholder: 'SOP link', input: 'url', required: true },
              { key: 'vendorContracts', label: 'Vendor Contracts', placeholder: 'Vendor contract folder link', input: 'url', required: true },
              { key: 'processMaps', label: 'Process Maps', placeholder: 'Process maps link', input: 'url', required: true },
              { key: 'complianceDocuments', label: 'Compliance Documents', placeholder: 'Compliance folder link', input: 'url', required: true },
            ],
          },
        ],
      },
      {
        type: 'timeline',
        id: 'operations-timeline',
        label: 'Operations Timeline',
        title: 'Operations Timeline',
        hint: 'Operational rollout dates',
        icon: 'calendar',
        startLabel: 'Operations start date',
        endLabel: 'Target completion date',
        actualEndLabel: 'Actual completion date',
        deadlineLabel: 'Operational urgency',
      },
      {
        type: 'team',
        id: 'operations-team',
        label: 'Team Members',
        title: 'Team Members',
        hint: 'Operations owners and contributors',
        icon: 'users',
        leadershipTitle: 'Operations ownership',
        leadershipDescription: 'Operations owner and execution lead.',
        managerLabel: 'Operations manager',
        leadLabel: 'Operations lead',
        memberTitle: 'Team members',
        memberDescription: 'Add operations contributors with responsibilities and permissions.',
        memberPickerLabel: 'Team member',
        defaultRole: 'Operations Analyst',
        roleOptions: operationsRoleOptions,
        requireMembers: true,
      },
      {
        type: 'budget',
        id: 'operations-budget',
        label: 'Budget',
        title: 'Budget',
        hint: 'Operational spend and resource allocation',
        icon: 'dollar',
        totalLabel: 'Operations budget ($)',
        developmentLabel: 'Vendor / platform cost ($)',
        resourceLabel: 'Resource cost ($)',
        remainingLabel: 'Remaining',
        requireTotal: true,
      },
      {
        type: 'review',
        id: 'operations-review',
        label: 'Review & Create',
        title: 'Review & Create',
        hint: 'Confirm operations setup before creating the project',
        icon: 'shield',
      },
    ],
  },
}

export const projectTemplateOptions = Object.keys(projectTemplateConfigs)

export function resolveProjectTemplate(template: string | undefined) {
  const trimmed = template?.trim()
  if (trimmed && trimmed in projectTemplateConfigs) return trimmed
  if (trimmed && legacyTemplateAliases[trimmed]) return legacyTemplateAliases[trimmed]
  return DEFAULT_PROJECT_TEMPLATE
}

export function getProjectTemplateConfig(template: string | undefined) {
  return projectTemplateConfigs[resolveProjectTemplate(template)]
}
