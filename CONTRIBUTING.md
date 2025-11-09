[< Back](./README.md)

# Contributing

This is the contribution document for the food ordering and tracking app.

## Before the Contribution

Please install the following dependencies:

> Consider using [mise](https://mise.jdx.dev/) for dependencies version control of Node.js and pnpm.

| Dependencies                             | Description        |
| ---------------------------------------- | ------------------ |
| [Node.js v24 LTS](https://nodejs.org/en) | JavaScript runtime |
| [pnpm v10.20](https://pnpm.io/)          | Better npm         |

## How to Run

Install dependencies:

```sh
pnpm i
```

For checking with TypeScript Compiler:

```sh
pnpm tsc
```

For checking and formatting code:

```sh
pnpm fmt
```

Run the server in development mode:

```sh
pnpm dev
```

Start the server in production mode:

```sh
pnpm build
pnpm start
```

## Git push policy

Using `git push --force` or `git push --force-with-lease` is strictly prohibited on any branch that is shared with other developers.

- Do: Push a new commit that fixes mistakes. Use `git revert <commit-hash>` to undo past commits safely.
- Do not: Rewrite public history (interactive rebase + force-push) on shared branches.

Exception: You may use force-push only if you created the branch, you are the only person working on it, and no one else will need to pull it.

If unsure, always create a fixup commit instead of force-pushing.
