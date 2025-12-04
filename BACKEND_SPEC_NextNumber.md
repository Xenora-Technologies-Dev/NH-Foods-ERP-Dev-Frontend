# Backend Implementation Spec: Next-Number Endpoint

**Status**: Required for optimal auto-numbering  
**Frontend Fallback**: Enabled (local random generator), but backend should provide sequences for production use

## CRITICAL REQUIREMENT: Sequence Numbers Must Be Generated ONLY on Save, Not on Preview

### Problem (How This Was Done Wrong)
If the `/transactions/next-number` endpoint increments the counter **every time it's called**, you will **waste sequence numbers**. 

Example:
- User opens SO form → endpoint called → returns `SO202511-00015` → counter increments to 00016
- User fills form but cancels → counter is now 00016 (00015 wasted)
- Next user creates SO → counter increments to 00017 (00016 wasted)

### Solution: Preview vs. Commit Pattern

**Option A: Preview + Commit (RECOMMENDED)**
1. **Frontend calls** `GET /transactions/next-number?type=sales_order&preview=true`
   - Returns next number WITHOUT incrementing counter
   - Frontend displays this in read-only field
2. **On Save**, frontend sends the SO/PO payload WITH that number
3. **Backend validates** the number matches expected sequence and **only then increments**

**Option B: Generate-on-Save Only**
1. **Form open**: Frontend does NOT call `/transactions/next-number`
2. **On Save**: Frontend includes `"requestNumber": true` in payload
3. **Backend** generates and increments counter as part of the create operation
4. **Backend returns** the generated number

---

## Endpoint Specification

### URL
```
GET /api/v1/transactions/next-number?type={orderType}[&preview=true]
```

### Query Parameters
- `type` (required, string): The order type
  - `purchase_order` — generates next PO number
  - `sales_order` — generates next SO number
- `preview` (optional, boolean): If `true`, return next number WITHOUT incrementing counter
  - Default: `false` (increments counter and returns)

### Response Format
The endpoint should return **one of these JSON shapes** (frontend accepts all):

#### Option 1 (Recommended)
```json
{
  "success": true,
  "data": {
    "next": "PO202511-00001"
  }
}
```

#### Option 2
```json
{
  "data": {
    "nextNumber": "PO202511-00001"
  }
}
```

#### Option 3
```json
{
  "next": "PO202511-00001"
}
```

### Number Format

**Purchase Orders**: `POYYYYMM-NNNNN`
- `PO` — literal prefix
- `YYYY` — 4-digit year (e.g., 2025)
- `MM` — 2-digit month (01–12)
- `NNNNN` — 5-digit sequence (00001–99999)
- Example: `PO202511-00001`

**Sales Orders**: `SOYYYYMM-NNNNN`
- `SO` — literal prefix
- `YYYY` — 4-digit year
- `MM` — 2-digit month
- `NNNNN` — 5-digit sequence (00001–99999)
- Example: `SO202511-00001`

### Error Handling
- **400 Bad Request**: Invalid `type` parameter
  ```json
  {
    "success": false,
    "message": "Invalid order type. Use 'purchase_order' or 'sales_order'."
  }
  ```
- **500 Internal Server Error**: Database or sequence generation failure
  ```json
  {
    "success": false,
    "message": "Failed to generate next number."
  }
  ```

### HTTP Status Codes
- `200 OK` — Successfully generated and returned next number
- `400 Bad Request` — Invalid input
- `500 Internal Server Error` — Server-side failure

---

## Implementation Guide

### Database Schema (Example)

Create a table to track sequences per year/month:

```sql
CREATE TABLE transaction_sequences (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  type VARCHAR(50) NOT NULL, -- 'purchase_order' or 'sales_order'
  year INT NOT NULL,
  month INT NOT NULL,
  sequence_number INT NOT NULL DEFAULT 0,
  UNIQUE KEY unique_sequence (type, year, month)
);
```

### Node.js / Express Implementation (Example)

```javascript
// In your transactions router (e.g., routes/transactions.js)

router.get('/next-number', async (req, res) => {
  const { type, preview } = req.query;
  const isPreview = preview === 'true'; // Read-only preview mode

  // Validate type
  if (!type || !['purchase_order', 'sales_order'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order type. Use 'purchase_order' or 'sales_order'."
    });
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = type === 'purchase_order' ? 'PO' : 'SO';

    // Get or create sequence record for this type/year/month
    let record = await TransactionSequence.findOne({
      type,
      year,
      month: parseInt(month)
    });

    if (!record) {
      record = new TransactionSequence({
        type,
        year,
        month: parseInt(month),
        sequence_number: 0
      });
    }

    // CRITICAL: Only increment if NOT in preview mode
    if (!isPreview) {
      record.sequence_number += 1;
      await record.save();
    } else {
      // In preview mode, just peek at the next number (do NOT save)
      // If we want to show what the next number WILL be, peek +1
      // Or just show the current state
    }

    // Calculate the number to return
    // If preview: show next (current + 1)
    // If commit: show current (just incremented)
    const displaySeq = isPreview 
      ? record.sequence_number + 1  // Peek at what's coming
      : record.sequence_number;       // Return what we just committed

    const sequence = String(displaySeq).padStart(5, '0');
    const nextNumber = `${prefix}${year}${month}-${sequence}`;

    res.json({
      success: true,
      data: {
        next: nextNumber
      }
    });

  } catch (error) {
    console.error('Failed to generate next number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate next number.'
    });
  }
});
```

---

## Frontend Integration

### How the Frontend Uses This Endpoint

**Current Frontend Behavior:**
1. **Component Mount** (Create mode, Auto number):
   - Calls `/transactions/next-number?type=sales_order` ONE TIME (via useRef guard)
   - Displays number in read-only field
   - User can still toggle to Manual mode

2. **On Save**:
   - Sends payload with that number
   - Backend saves the order

3. **Fallback**:
   - If endpoint returns 404 or errors, uses local random generator

**Recommended Future Enhancement:**
- Add `preview=true` parameter to fetch without incrementing
- Backend then increments ONLY when order is saved

### Testing the Endpoint

**PowerShell**:
```powershell
$headers = @{ "Authorization" = "Bearer YOUR_TOKEN_HERE" }
# Preview mode (does NOT increment)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/transactions/next-number?type=purchase_order&preview=true" -Headers $headers

# Commit mode (DOES increment counter)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/transactions/next-number?type=purchase_order" -Headers $headers
```

**cURL**:
```bash
# Preview (no increment)
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  "http://localhost:3000/api/v1/transactions/next-number?type=purchase_order&preview=true"

# Commit (increment counter)
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  "http://localhost:3000/api/v1/transactions/next-number?type=purchase_order"
```

---

## Field Mapping: Frontend vs. Backend

| Concept | Backend Field | Frontend Field | Notes |
|---------|---------------|----------------|-------|
| Draft Order Number | `transactionNo` | `formData.transactionNo` | Used in forms; preserved on update |
| Invoice Number (After Approve) | `transactionNumber` | `so.transactionNumber` | Displayed in approved invoice view |
| Order Status | `status` | `formData.status` | DRAFT → APPROVED workflow |
| Display Text (DRAFT) | `transactionNo` | Read-only field | Shows order number |
| Display Text (APPROVED) | Combined | `orderNumber • INV:transactionNumber` | Shows both in invoice view |

---

## Notes

- The endpoint should check authorization (current user's tenant/company context)
- Sequence numbers should **never** decrease or skip (use atomic operations/locks in high-concurrency scenarios)
- The frontend logs will show `[SO] Fetched next number from backend: SOXXXXXXX-XXXXX` when successful
- **Do NOT increment the counter on preview requests** — this is the key to avoiding wasted numbers
- Consider locking the sequence record during increment to prevent race conditions

---

## Checklist for Backend Dev

- [ ] Create `TransactionSequence` table or equivalent
- [ ] Add `/api/v1/transactions/next-number` GET endpoint
- [ ] Validate `type` query parameter
- [ ] Accept optional `preview=true` parameter
  - [ ] If `preview=true`: return next number WITHOUT incrementing
  - [ ] If `preview=false|not set`: increment counter and return
- [ ] Generate numbers in `POYYYYMM-NNNNN` / `SOYYYYMM-NNNNN` format
- [ ] Return success JSON with `data.next` field
- [ ] Handle 400 (invalid type) and 500 (generation failure) errors
- [ ] Test endpoint with both `type=purchase_order` and `type=sales_order`
- [ ] Test with `preview=true` and verify counter does NOT increment
- [ ] Test with `preview=false` (or no param) and verify counter DOES increment
- [ ] Verify sequences increment correctly per year/month
- [ ] Add unit/integration tests
- [ ] Document in API docs or Swagger/OpenAPI
- [ ] **CRITICAL**: Test sequence integrity under concurrent requests (use DB locks/transactions)

