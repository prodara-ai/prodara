// ---------------------------------------------------------------------------
// Prodara CLI — Project Starter Templates
// ---------------------------------------------------------------------------
// Provides predefined .prd scaffolds for common project types.

export type StarterTemplate = 'minimal' | 'saas' | 'marketplace' | 'internal-tool' | 'api';

export interface TemplateInfo {
  readonly name: StarterTemplate;
  readonly description: string;
  readonly files: ReadonlyArray<{ path: string; content: string }>;
}

export function listStarterTemplates(): readonly TemplateInfo[] {
  return TEMPLATES.map(t => ({
    name: t.name,
    description: t.description,
    files: t.files,
  }));
}

export function getStarterTemplate(name: string, productName: string): TemplateInfo | null {
  const tmpl = TEMPLATES.find(t => t.name === name);
  if (!tmpl) return null;
  return {
    name: tmpl.name,
    description: tmpl.description,
    files: tmpl.files.map(f => ({
      path: f.path,
      content: f.content.replaceAll('{{product}}', productName)
        .replaceAll('{{title}}', formatTitle(productName)),
    })),
  };
}

function formatTitle(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

const TEMPLATES: readonly TemplateInfo[] = [
  {
    name: 'minimal',
    description: 'Minimal project with a single entity',
    files: [
      {
        path: 'app.prd',
        content: `product {{product}} {
  title: "{{title}}"
  version: "0.1.0"
  modules: [core]
}

module core {

  entity item {
    id: uuid
    title: string
    done: boolean = false
  }

}
`,
      },
    ],
  },
  {
    name: 'saas',
    description: 'SaaS application with auth, billing, and tenancy',
    files: [
      {
        path: 'app.prd',
        content: `product {{product}} {
  title: "{{title}}"
  version: "0.1.0"
  modules: [auth, billing, core]
}
`,
      },
      {
        path: 'auth.prd',
        content: `module auth {

  entity user {
    id: uuid
    email: string
    name: string
    role: role
    tenant: tenant
    created_at: datetime
  }

  entity tenant {
    id: uuid
    name: string
    plan: plan
    created_at: datetime
  }

  enum role {
    admin
    member
    viewer
  }

  workflow sign_up {
    input { email: string, name: string, tenant_name: string }
    output { user: user, tenant: tenant }
    steps {
      create_tenant -> create_user -> send_welcome
    }
  }

  workflow sign_in {
    input { email: string, password: string }
    output { token: string }
    steps {
      validate_credentials -> issue_token
    }
  }

}
`,
      },
      {
        path: 'billing.prd',
        content: `module billing {

  entity plan {
    id: uuid
    name: string
    price_cents: integer
    interval: billing_interval
    features: list<string>
  }

  entity subscription {
    id: uuid
    tenant: auth.tenant
    plan: plan
    status: subscription_status
    current_period_end: datetime
  }

  enum billing_interval {
    monthly
    yearly
  }

  enum subscription_status {
    active
    past_due
    canceled
    trialing
  }

  workflow subscribe {
    input { tenant: auth.tenant, plan: plan }
    output { subscription: subscription }
    steps {
      validate_plan -> create_subscription -> provision_access
    }
  }

}
`,
      },
      {
        path: 'core.prd',
        content: `module core {

  entity project {
    id: uuid
    name: string
    owner: auth.user
    tenant: auth.tenant
    created_at: datetime
  }

}
`,
      },
    ],
  },
  {
    name: 'marketplace',
    description: 'Two-sided marketplace with listings, orders, and reviews',
    files: [
      {
        path: 'app.prd',
        content: `product {{product}} {
  title: "{{title}}"
  version: "0.1.0"
  modules: [users, catalog, orders]
}
`,
      },
      {
        path: 'users.prd',
        content: `module users {

  entity user {
    id: uuid
    email: string
    name: string
    type: user_type
    created_at: datetime
  }

  enum user_type {
    buyer
    seller
    admin
  }

}
`,
      },
      {
        path: 'catalog.prd',
        content: `module catalog {

  entity listing {
    id: uuid
    seller: users.user
    title: string
    description: string
    price_cents: integer
    status: listing_status
    created_at: datetime
  }

  enum listing_status {
    draft
    active
    sold
    archived
  }

  entity review {
    id: uuid
    listing: listing
    reviewer: users.user
    rating: integer
    comment: string
    created_at: datetime
  }

  workflow publish_listing {
    input { listing: listing }
    output { listing: listing }
    steps {
      validate_listing -> activate -> notify_followers
    }
  }

}
`,
      },
      {
        path: 'orders.prd',
        content: `module orders {

  entity order {
    id: uuid
    buyer: users.user
    listing: catalog.listing
    status: order_status
    total_cents: integer
    created_at: datetime
  }

  enum order_status {
    pending
    paid
    shipped
    delivered
    canceled
  }

  workflow place_order {
    input { buyer: users.user, listing: catalog.listing }
    output { order: order }
    steps {
      reserve_listing -> charge_payment -> create_order -> notify_seller
    }
  }

}
`,
      },
    ],
  },
  {
    name: 'internal-tool',
    description: 'Internal tool with admin dashboard and task management',
    files: [
      {
        path: 'app.prd',
        content: `product {{product}} {
  title: "{{title}}"
  version: "0.1.0"
  modules: [admin, tasks]
}
`,
      },
      {
        path: 'admin.prd',
        content: `module admin {

  entity employee {
    id: uuid
    email: string
    name: string
    department: string
    role: admin_role
  }

  enum admin_role {
    super_admin
    manager
    staff
  }

  screen dashboard {
    title: "Dashboard"
    sections: [stats_panel, recent_activity]
  }

}
`,
      },
      {
        path: 'tasks.prd',
        content: `module tasks {

  entity task {
    id: uuid
    title: string
    description: string
    assignee: admin.employee
    status: task_status
    priority: priority
    due_date: datetime
    created_at: datetime
  }

  enum task_status {
    open
    in_progress
    review
    done
  }

  enum priority {
    low
    medium
    high
    critical
  }

  workflow assign_task {
    input { task: task, assignee: admin.employee }
    output { task: task }
    steps {
      validate_assignment -> update_task -> notify_assignee
    }
  }

}
`,
      },
    ],
  },
  {
    name: 'api',
    description: 'API-first project with resources and versioning',
    files: [
      {
        path: 'app.prd',
        content: `product {{product}} {
  title: "{{title}} API"
  version: "0.1.0"
  modules: [api, auth]
}
`,
      },
      {
        path: 'auth.prd',
        content: `module auth {

  entity api_key {
    id: uuid
    name: string
    key_hash: string
    scopes: list<string>
    rate_limit: integer = 1000
    created_at: datetime
    expires_at: datetime
  }

  workflow authenticate {
    input { api_key: string }
    output { principal: api_key }
    steps {
      lookup_key -> validate_expiry -> check_rate_limit
    }
  }

}
`,
      },
      {
        path: 'api.prd',
        content: `module api {

  entity resource {
    id: uuid
    type: string
    data: string
    owner: auth.api_key
    created_at: datetime
    updated_at: datetime
  }

  workflow create_resource {
    input { type: string, data: string }
    output { resource: resource }
    steps {
      validate_schema -> persist -> index -> respond
    }
  }

  workflow list_resources {
    input { type: string, page: integer, limit: integer }
    output { items: list<resource>, total: integer }
    steps {
      authorize -> query -> paginate -> respond
    }
  }

}
`,
      },
    ],
  },
];
