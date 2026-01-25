# Bolt's Journal

## 2024-05-23 - HistoryView Optimization **Learning:** React components inside large parent components (`App.jsx`) without stable callback references cause frequent re-renders of children, even if those children are heavy lists. **Action:** Always wrap actions passed to heavy list components in `useCallback` and use `React.memo` on the list component and its items. In this case, `HistoryView` was re-rendering on every keystroke in other views because `useProjectState` actions were unstable.

## 2024-05-24 - Input Stability **Learning:** When lifting state up to a common parent (like `App.jsx` via `useProjectState`) for inputs, every keystroke causes a full app re-render. Memoizing static siblings (`Sidebar`, `BottomNav`) is useless if their props (callbacks) are unstable. **Action:** Ensure all event handlers passed to layout components are wrapped in `useCallback` in the custom hook, then `React.memo` the layout components.

## 2024-05-25 - Token Usage Optimization **Learning:** Small utility components that perform seemingly cheap operations (like `JSON.stringify` on a list) can become bottlenecks if they re-render on every keystroke of a parent input. **Action:** Memoize components that perform array/object iteration or serialization, even if they look small. Use `useMemo` for derived statistics to prevent main-thread blocking during high-frequency updates like typing.

## 2024-05-25 - BlueprintStage List Optimization **Learning:** `BlueprintStage` couples high-frequency chat input state with a heavy `framer-motion` list (`FeatureCard`). Without `React.memo`, typing in the chat triggers re-renders of all feature cards, causing input lag. **Action:** Memoize all list item components (`FeatureCard`) that are rendered alongside interactive inputs, especially when using animation libraries like `framer-motion`.

## 2025-02-18 - QuestionsStage Optimization **Learning:** In lists of controlled inputs (like `QuestionsStage`), defining handlers inline inside `map` breaks memoization, causing O(N) re-renders on every keystroke. **Action:** Extract the input item to a `React.memo` component (`QuestionItem`) and pass a stable `useCallback` handler that accepts an index.

## 2024-05-26 - Mapped Input Optimization **Learning:** Large forms with mapped inputs (like `QuestionsStage`) cause O(N) re-renders on every keystroke if items aren't memoized. **Action:** Extract mapped inputs into `React.memo` components and pass stable `useCallback` handlers.

## 2024-05-26 - BlueprintStage Input Isolation **Learning:** Moving the transient `refinementInput` state from the global `useProjectState` hook to local component state in `BlueprintStage` completely eliminated full-app re-renders during typing, solving a significant input lag issue. **Action:** Always check if high-frequency input state needs to be global. If it's only used for a specific action (like sending a message), keep it local and pass the value to the handler.
