# Sequence Number Fix Summary

## Problem Identified
When users clicked "Create SO/PO", the form would immediately fetch the next sequence number from the backend. If they clicked Back without saving, that number was wasted.

**Example of the Bug**:
1. User clicks "Create SO" → fetches SO-00026 (backend increments to 27)
2. User realizes they need to check something, clicks Back
3. SO-00026 is now wasted (will never be used)
4. Next user creates SO → gets SO-00027
5. Sequence numbers have gaps: 00026 is missing

## Solution Implemented

### Frontend Changes (✅ COMPLETE)

**Modified Files**:
- `src/components/PurchaseOrder/sales/SOForm.jsx`
- `src/components/PurchaseOrder/purchase/POForm.jsx`

**Key Changes**:

1. **Removed automatic fetch on form load**
   - Previously: Called `/next-number` immediately when form opened
   - Now: Placeholder shown "Will be generated on save"

2. **Fetch ONLY on save**
   - When user clicks Save button in Auto mode:
     - Calls `/transactions/next-number?type=...`
     - Uses returned number in the payload
     - Sends to backend

3. **Updated UI/UX**
   - Auto mode: Shows placeholder "Will be generated on save"
   - Manual mode: Shows "Enter SO/PO number"
   - Tooltips updated to clarify behavior

### Frontend Flow (New)

```
Create SO Flow (Auto Mode):
├─ User opens form
│  └─ Shows: "Will be generated on save" (NO fetch)
├─ User fills form
│  └─ No calls to backend
└─ User clicks Save
   ├─ Fetches next number from backend (NOW fetch happens)
   ├─ Uses fetched number in payload
   └─ Backend saves and increments counter

Cancel Flow (Auto Mode):
├─ User opens form
│  └─ Shows: "Will be generated on save" (NO fetch)
├─ User clicks Back
│  └─ NO sequence number consumed ✅
└─ Next user gets same number ✅
```

### Backend Requirements

**Endpoint**: `GET /api/v1/transactions/next-number?type=purchase_order|sales_order`

**Expected Behavior**:
- Increments counter ONCE per request
- Returns formatted number: `POYYYYMM-NNNNN` or `SOYYYYMM-NNNNN`
- Frontend now calls this ONLY during save (no preview calls)

**See**: `BACKEND_SPEC_NextNumber_FINAL.md` for full implementation details

---

## Results

### What This Fixes

✅ **No More Wasted Numbers**
- Each fetch = one save
- No gaps in sequences
- 00001, 00002, 00003... (continuous)

✅ **Better UX**
- User sees "Will be generated on save"
- Clear expectation management
- No confusion about when numbers are assigned

✅ **Correct Behavior for Edit**
- Editing an order doesn't consume a new number
- Uses existing transactionNo

---

## Testing Checklist

### Frontend Testing (Manual)
- [ ] Click "Create SO" → field shows "Will be generated on save"
- [ ] Fill form and click Save → number appears after successful save
- [ ] Open another "Create SO" → should show "Will be generated on save" again
- [ ] Create SO, check invoice → number displays correctly
- [ ] Try Manual mode → can enter custom number
- [ ] Try Manual mode on PO → can enter custom PO number

### Backend Testing
- [ ] GET `/api/v1/transactions/next-number?type=sales_order` → returns `SO202511-00001`
- [ ] Call 5 times in sequence → verify increments to 00002, 00003, 00004, 00005, 00006
- [ ] No duplicates when called concurrently (use load testing)

---

## Files Changed

```
src/components/PurchaseOrder/sales/SOForm.jsx
  - Removed useEffect that fetched on mount
  - Changed fetchNextSONumber to return number instead of setting state
  - Updated saveSO to call fetchNextSONumber only when saving in Auto mode
  - Updated SO Number field placeholder text

src/components/PurchaseOrder/purchase/POForm.jsx
  - Removed useEffect that fetched on mount
  - Changed fetchNextNumber to return number instead of setting state
  - Updated savePO to call fetchNextNumber only when saving in Auto mode
  - Updated PO Number field placeholder text

BACKEND_SPEC_NextNumber_FINAL.md (NEW)
  - Complete updated spec with new behavior documented
```

---

## Migration Notes

No database migrations needed. Backend endpoint behavior unchanged.

The frontend now simply **calls at a different time** (on save instead of on form load).

---

## Troubleshooting

**Q: Auto mode still shows empty field?**
A: After save, the returned order should populate the field. If blank, check backend response contains `transactionNumber` or `transactionNo`.

**Q: Numbers still being skipped?**
A: Verify backend endpoint is being called ONLY once per save, not multiple times.

**Q: Manual mode validation failing?**
A: Must match pattern: `POYYYYMM-NNNNN` or `SOYYYYMM-NNNNN`
  - Example: `PO202511-00001` ✅
  - Example: `SO202511-12345` ✅
  - Example: `PO20251100001` ❌ (missing dash)
