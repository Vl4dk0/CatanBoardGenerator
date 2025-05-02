0. Read and understand the code. the code base is 99.9% AI generated (Gemini 2.5 pro)

1. Refactor:
   - the whole generation code resides in the CatanBoard.tsx, which feels wrong.
   - the button positioning is hardcoded as some big padding for bottom, which is wrong, we might want to rethink the css after the refactor
   - the button color and style is super shit. It want something better and it wants to be in a separate file.
   - remove bullshit AI generated comments

2. Add options for user:
   - user can choose some values based on which it will generate the board

