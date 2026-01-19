# Bolt's Journal

## 2024-05-23 - HistoryView Optimization **Learning:** React components inside large parent components (`App.jsx`) without stable callback references cause frequent re-renders of children, even if those children are heavy lists. **Action:** Always wrap actions passed to heavy list components in `useCallback` and use `React.memo` on the list component and its items. In this case, `HistoryView` was re-rendering on every keystroke in other views because `useProjectState` actions were unstable.
