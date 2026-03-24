# Bracket Factory

Bracket Factory is a Next.js + TypeScript + Tailwind web app for generating seeded sports tournament brackets.

## Features

- Create a tournament with a custom name
- Support for 4, 8, 16, and 32-team brackets
- Enter team names and optional seeds
- Generate single-elimination or double-elimination brackets
- View the bracket by rounds
- Pick winners and automatically advance them
- Export the bracket as JSON, PNG, or PDF
- Save the current draft and bracket state in `localStorage`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open `http://localhost:3000`.

## File Structure

- `app/`
  - `layout.tsx`: root layout and font setup
  - `page.tsx`: main application shell and state management
  - `globals.css`: Tailwind layers and shared styling
- `components/`
  - `team-editor.tsx`: editable team and seed inputs
  - `match-card.tsx`: interactive match picker
  - `bracket-board.tsx`: round-by-round bracket rendering
- `lib/bracket/`
  - `models.ts`: core TypeScript data structures
  - `utils.ts`: bracket helpers, IDs, seeding utilities, draft creation
  - `generation.ts`: single and double-elimination bracket creation
  - `progression.ts`: winner updates, propagation, and champion calculation
- `lib/export.ts`: JSON, PNG, and PDF export helpers
- `lib/storage.ts`: `localStorage` persistence helpers

## Core Logic

### 1. Data structures

The app models tournaments with:

- `Team`: name and optional seed
- `MatchParticipant`: a slot in a match, sourced from a team, winner, or loser
- `Match`: participants, selected winner, loser, and advancement links
- `Round`: ordered groups of matches for rendering
- `Bracket`: full tournament state plus teams and rounds

### 2. Seed placement

The bracket generator uses recursive standard seed placement. For an 8-team bracket, the initial positions become:

`[1, 8, 4, 5, 2, 7, 3, 6]`

That ensures higher seeds meet later in the tournament.

### 3. Bracket generation

- Single elimination creates rounds where winners advance into the next round.
- Double elimination creates:
  - a winners bracket
  - a losers bracket
  - a grand final
  - a grand final reset match if the undefeated finalist loses the first final

Each match stores pointers to the next match slot for winners and, when relevant, losers.

### 4. Winner advancement

When a winner is selected:

- the match winner and loser are stored
- connected downstream match slots are updated
- dependent matches are cleared if earlier outcomes change
- the champion is recalculated

## Notes

- This first version is optimized for exact power-of-2 team counts.
- Brackets are saved in the browser only.
