# Project Guidelines

## Package Manager

Always use **bun** for package management and running scripts:

- Install packages: `bun add <package>`
- Install dev dependencies: `bun add -d <package>`
- Run scripts: `bun run <script>`
- Execute files: `bun <file>`

## Icons

Always use icons from `src/components/icons/index.tsx`. Never create inline SVGs or duplicate existing icons. If an icon doesn't exist, add it to the icons file.
