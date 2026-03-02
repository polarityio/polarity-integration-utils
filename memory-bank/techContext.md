# Tech Context

## Technologies Used

- **Language:** TypeScript (Strict Mode)
- **Runtime:** Node.js
- **Testing:** Jest
- **Validation:** Zod
- **Linting:** ESLint
- **Formatting:** Prettier

## Development Setup

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Run tests with `npm test`.
4. Build the project with `npm run build`.

## Technical Constraints

- The library must be compatible with the Node.js versions supported by the Polarity server.
- The library should have minimal external dependencies to reduce the risk of conflicts.
- **Type Safety:** All public APIs must be strictly typed. `any` should be avoided.

## Dependencies

- `typescript`
- `jest`
- `zod` (Runtime schema validation)
- `eslint`
- `prettier`
- `@types/node`
