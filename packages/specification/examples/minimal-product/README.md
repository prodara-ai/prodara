# Example: Minimal Product — Todo App

This is the smallest meaningful Prodara product. It demonstrates the core language constructs needed to specify a complete product: a domain entity, an actor, a workflow, an action, and a surface.

A human or AI reading this example should understand how a simple product is structured end-to-end.

---

## What You'll Learn

| Concept          | Construct     | File                | Purpose                                  |
|-----------------|---------------|---------------------|------------------------------------------|
| Product root    | `product`     | app.prd             | Names the product, lists modules         |
| Domain model    | `entity`      | todo.entities.prd   | Defines the shape of task data           |
| Error handling  | `enum`        | todo.entities.prd   | Named error cases for workflow returns   |
| Identity        | `actor`       | todo.behavior.prd   | Who uses the product                     |
| Capability      | `capability`  | todo.behavior.prd   | Logical grouping of behavior             |
| Business logic  | `workflow`    | todo.behavior.prd   | What happens when a task is created      |
| User action     | `action`      | todo.behavior.prd   | Exposes workflow to surfaces             |
| User interface  | `surface`     | todo.surfaces.prd   | What the user sees                       |

---

## Product Declaration

Every Prodara workspace starts with a product declaration that names the product and lists its modules.

    product todo_app {
      title: "Todo App"
      version: "0.1.0"
      modules: [todo]
    }

---

## Domain Model

    entity task {
      task_id: uuid
      title: string
      done: boolean = false       // default value
    }

    enum task_error {
      invalid_title
      creation_failed
    }

---

## Actor, Capability, Workflow, Action

    actor user {
      title: "User"
    }

    capability task_management {
      title: "Task Management"
    }

    workflow create_task {
      capability: task_management

      authorization {
        user: [task.create]
      }

      writes {
        task
      }

      returns {
        ok: task
        error: task_error
      }
    }

    action create_task {
      workflow: create_task
    }

---

## Surface

    surface task_list {
      kind: view
      title: "Tasks"              // direct string — no localization needed here
      binds: task
      actions: [create_task]
    }

This is the minimum viable product specification. From here, a code generator can produce a complete working application.


Who uses the product, and what can they do?

    module todo {

This is the minimum viable product specification. From here, a code generator can produce a complete working application.
