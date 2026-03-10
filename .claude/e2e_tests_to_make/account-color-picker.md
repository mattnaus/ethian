# E2E Tests: Account color picker

Feature introduced in commit `9ac16b0`.

---

## Test 1: Random color pre-selected when adding a new account

**Scenario:** Opening the Add Account dialog always pre-selects one of the palette swatches.

**Steps:**
1. Log in and navigate to `/settings`.
2. Click "Add account".
3. Observe the color swatch row — one swatch should have the active selection ring/scale.
4. Close the dialog without saving.
5. Click "Add account" again.
6. Observe the color swatch row again — a swatch should still be pre-selected (may be the same or different).

**Expected outcome:** A swatch is always pre-selected when the dialog opens in add mode. No swatch is ever un-selected (there is always a valid default).

---

## Test 2: Existing color pre-selected when editing an account

**Scenario:** Opening the Edit dialog for an account highlights the swatch matching its saved color.

**Steps:**
1. Log in and navigate to `/settings`.
2. Ensure at least one mail account exists with a known color (e.g. the default `#3b82f6` blue).
3. Click the Edit (pencil) button for that account.
4. Observe the color swatch row.

**Expected outcome:** The swatch corresponding to the account's saved color is highlighted (active ring visible). No other swatch is highlighted.

---

## Test 3: Changing color and saving persists the new color

**Scenario:** Selecting a different swatch and submitting the form saves the new color to the account.

**Steps:**
1. Log in and navigate to `/settings`.
2. Open Edit for an account currently set to blue (`#3b82f6`).
3. Click the red swatch (`#ef4444`).
4. Confirm the red swatch becomes active and blue loses its ring.
5. Submit the form ("Save changes").
6. After the dialog closes, observe the accounts list — the colored dot next to the account name should now be red.
7. Re-open Edit for the same account.
8. Confirm the red swatch is pre-selected.

**Expected outcome:** The color dot in the list reflects the new color immediately after save. Re-opening the edit form shows the saved color pre-selected.
