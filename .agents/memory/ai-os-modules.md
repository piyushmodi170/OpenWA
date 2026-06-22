---
name: AI OS module wiring
description: How the 4 new AI OS modules integrate with the existing OpenWA stack
---

## Rule
All 4 new modules (AiEmployees, AiTraining, ConversationIntelligence, AiCampaigns) use the `'data'` named TypeORM connection and must use `@InjectRepository(Entity, 'data')`.

## AiBotModule ↔ Knowledge injection
- AiBotModule imports AiEmployeesModule and AiTrainingModule (not forwardRef — no circular dependency).
- AiBotService gets AiEmployeesService and AiTrainingService via `@Optional()` so it degrades gracefully.
- When `AiBotConfig.employeeId` is set, `generateReplyRaw` calls `buildEmployeeSystemPrompt(employeeId)` which fetches the employee + injects knowledge docs, training examples, and rules into the system prompt.
- When `employeeId` is null, falls back to the legacy `buildSystemPrompt(config)` method unchanged.

**Why:** Keeps the existing AI Bot page fully functional while giving the new AI Employees system priority when an employee is assigned.

**How to apply:** If you add more context sources (e.g., conversation history), inject them in `buildEmployeeSystemPrompt` alongside knowledge/examples/rules.

## Entity glob paths (app.module.ts)
Each new module's entities are registered via glob in the `'data'` TypeORM connection:
```
__dirname + '/modules/ai-employees/**/*.entity{.ts,.js}'
__dirname + '/modules/ai-training/**/*.entity{.ts,.js}'
__dirname + '/modules/conversation-intelligence/**/*.entity{.ts,.js}'
__dirname + '/modules/ai-campaigns/**/*.entity{.ts,.js}'
```

## Dashboard wiring
- Routes in `dashboard/src/App.tsx` use lazy + named export pattern.
- Nav items in `dashboard/src/components/Layout.tsx` use `allNavItems` array with lucide-react icons.
- `apiRequest<T>` helper exported from `dashboard/src/services/api.ts` — wraps the internal `request<T>` function.
- i18n nav keys added to all 9 locale files: `aiEmployees`, `aiTraining`, `conversationIntelligence`, `aiCampaigns`.
