# TODO

## 1. Refactoring & Code Structure
- Move global styles to a dedicated file (currently duplicated in `index.tsx` and `CatanBoard.tsx`).
- Refactor `CatanBoard.tsx` so it only renders the board; move UI logic (ThemeToggle, button, etc.) to `index.tsx`.

## 2. UI/UX Improvements
- Rethink and improve button color and style; move button styles to a separate file.
- Position the "regenerate board" button so it sits exactly between the bottom of the board and the bottom of the screen (avoid hardcoded padding).
- Rethink the color palette, especially for buttons (see `constants.ts`).

## 3. Theming & Responsiveness
- Dynamically calculate SVG viewbox width and height based on screen size, and adjust `svg_radius` accordingly.

## 4. Code Quality & Optimization
- Check if all properties on the `ThemeColors` interface are needed and remove unused ones.
- Optimize the following constants in `catanLogic.ts`:
  - `MAX_TOTAL_GENERATION_ATTEMPTS`
  - `MAX_TILE_PHASE_ATTEMPTS`
  - `MAX_TILE_TRIES_PER_SPOT`
  - `MAX_NUMBER_PHASE_ATTEMPTS`
- Make the port mapping in `catanLogic.ts` a constant.

## 5. User Options & Features
- Add options for the user to choose values that affect board generation.

