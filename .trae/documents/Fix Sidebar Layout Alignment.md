I will fix the sidebar layout alignment by updating the dimension constants and enforcing robust container styles.

### **Plan: Fix Sidebar Layout Alignment**

**1. Update Sidebar Dimensions & Z-Index**

* **File:** `src/components/ui/sidebar.tsx`

* **Action:**

  * Update `SIDEBAR_WIDTH` from `16rem` to `17.5rem` (280px) to match the PRD and ensure proper spacing.

  * Increase the sidebar's `z-index` from `z-10` to `z-30` to prevent content overlapping.

  * Ensure `SidebarInset` has `overflow-x-hidden` and `w-full` to prevent horizontal scrolling or layout shifts.

**2. Enforce Flex Layout Structure**

* **File:** `src/components/Layout.tsx`

* **Action:**

  * Verify and enforce the `SidebarProvider` -> `AppSidebar` + `SidebarInset` structure.

  * Ensure the `SidebarInset` child container uses `flex-1` and `w-full` to properly fill the remaining 75% (approx) space.

**3. Verify Responsive Behavior**

* **Action:** Ensure the existing `useIsMobile` hook and `Sheet` component integration in `sidebar.tsx` are correctly configured to handle mobile views (collapsing to a drawer).

**Verification Steps:**

* Check that the sidebar width is exactly 280px on desktop.

* Verify that the main content area resizes correctly (takes remaining width) without overlap.

* Confirm that the sidebar sits above main content elements (z-index check).

* Verify mobile behavior (hamburger menu triggers drawer).

