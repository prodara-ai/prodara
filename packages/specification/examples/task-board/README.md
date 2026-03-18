# Example: Task Board (Kanban)

This example demonstrates a kanban-style task board. It exercises language features not covered by the simpler examples: **events with typed payloads**, **workflow branching** (`decide`/`when`), **event-triggered workflows** (`on:`), **rendering with grid layout**, **storage configuration**, and **spec-level tests with `given`/`expect`**.

---

## What You'll Learn

| Concept                  | Construct                    | File           |
|--------------------------|------------------------------|----------------|
| Events with payloads     | `event task_moved`           | board.prd      |
| Event-triggered workflow | `on: task_completed`         | board.prd      |
| Workflow branching       | `decide`/`when`              | board.prd      |
| Input & reads blocks     | `input { ... }`, `reads { }` | board.prd     |
| Emit effects             | `emit task_moved`            | board.prd      |
| Storage with indexes     | `storage task_storage`       | board.prd      |
| Spec tests with given    | `given { task.status: ... }` | board.prd      |
| Grid rendering           | `grid { columns: [...] }`   | platform.prd   |
| Responsive breakpoints   | `at design.base.breakpoint`  | platform.prd   |
| Schedules                | `schedule daily_archive`     | platform.prd   |

---

## Product Structure

    product task_board {
      title: "Task Board"
      version: "0.1.0"
      modules: [board, design, platform]
    }

- `board` — domain model, events, workflows, storage, tests
- `design` — visual tokens
- `platform` — rendering, schedules

---

## Key Patterns

### Events and emit

Events declare something that happened. Workflows emit events as effects:

    event task_moved {
      payload: task
    }

    workflow move_task {
      effects {
        emit task_moved
      }
    }

### Event-triggered workflows

A workflow can be triggered by an event instead of a user action:

    workflow notify_completion {
      on: task_completed
      ...
    }

### Decide/when branching

Workflows can branch based on conditions:

    steps {
      call validate_move

      decide current_status {
        when done -> fail already_done
        when review -> call finalize_task
      }

      call apply_transition
    }

### Rendering with grid layout

Rendering defines how a surface looks on a specific platform:

    rendering board_layout {
      target: board.board_view
      platform: web
      layout: grid

      grid {
        columns: [1, 1, 1, 1]       // 4 equal kanban columns
        gap: 16
      }

      at design.base.breakpoint.sm {
        grid {
          columns: [1]               // single column on mobile
        }
      }
    }

### Storage

Storage declares how an entity is persisted:

    storage task_storage {
      target: task
      model: relational
      table: "tasks"
      indexes: [
        [status],
        unique [task_id]
      ]
    }

### Tests with given/expect

    test move_from_backlog_to_in_progress {
      target: move_task

      given {
        task.status: backlog
      }

      expect {
        transition: "task.status: backlog -> in_progress"
      }
    }
