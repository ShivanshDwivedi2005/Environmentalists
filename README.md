# Terra Ledger

Citizen pollution index and cleanup network for India. Photograph pollution, explore rankings from state to village, and join local cleanup drives.

## Stack

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Development

Needs Node.js 20+ and npm.

```sh
git clone https://github.com/ShivanshDwivedi2005/Environmentalists.git
cd Environmentalists
npm install
npm run dev
```

Other scripts:

```sh
npm run build
npm run test
npm run lint
```

## Project notes

- Geographic ranking levels and drill-down lists live in the shared data module so every view uses the same hierarchy.
- Home scenery is loaded from CDN URLs rather than committed video files.
