# Backend Implementation Spec: Next-Number Endpoint

**Status**: Required for optimal auto-numbering  
**Frontend Fallback**: Enabled (local random generator), but backend should provide sequences for production use

## CRITICAL REQUIREMENT: Sequence Numbers Generated ONLY on Save (Frontend Updated)

### Frontend Behavior Change (FIXED - NEW)
The frontend has been updated to **NEVER call the next-number endpoint before save**. This prevents wasted sequence numbers.

**Previous (Buggy) Behavior**:
- User opens "Create SO" → calls `/next-number` → gets SO-00026 (backend increments to 27)
- User clicks "Back" without saving → SO-00026 is wasted
- Next user creates SO → calls `/next-number` → gets SO-00027

**New (Correct) Behavior**:
- User opens "Create SO" → **NO call to endpoint** → field shows placeholder "Will be generated on save"
- User fills form and clicks Save → **THEN calls endpoint** → gets SO-00026 (backend increments to 27)
- User clicks Back without saving → **No number consumed**, next user still gets SO-00026

---

## Endpoint Specification

### URL
```
GET /api/v1/transactions/next-number?type={orderType}
```

### Query Parameters
- `type` (required, string): The order type
  - `purchase_order` — generates next PO number
  - `sales_order` — generates next SO number

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
  const { type } = req.query;

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

    // Increment sequence (frontend now calls this ONLY when saving)
    record.sequence_number += 1;
    await record.save();

    // Format: POYYYYMM-NNNNN or SOYYYYMM-NNNNN
    const sequence = String(record.sequence_number).padStart(5, '0');
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

**Updated Frontend Behavior (NEW - FIXED)**:
1. **Component Mount** (Create mode, Auto number):
   - Shows placeholder: "Will be generated on save"
   - **DOES NOT call backend**
   - User can toggle to Manual mode to enter custom number

2. **On Save** (Auto mode):
   - **ONLY NOW** calls `/transactions/next-number?type=...`
   - Uses returned number in the payload
   - Backend increments counter

3. **On Save** (Manual mode):
   - Uses user-entered number from field
   - Backend processes as custom number

4. **On Save** (Edit mode):
   - Does NOT fetch new number
   - Uses existing number from loaded order

5. **Fallback Behavior**:
   - If endpoint returns 404 or errors during save, uses local fallback generator
   - Console logs: `[PO] Fetched next number from backend: POXXXXXXX-XXXXX`

### Testing the Endpoint

**PowerShell**:
```powershell
$headers = @{ "Authorization" = "Bearer YOUR_TOKEN_HERE" }
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/transactions/next-number?type=purchase_order" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/transactions/next-number?type=sales_order" -Headers $headers
```

**cURL**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  "http://localhost:3000/api/v1/transactions/next-number?type=purchase_order"

curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  "http://localhost:3000/api/v1/transactions/next-number?type=sales_order"
```

---

## Field Mapping: Frontend vs. Backend

| Concept | Backend Field | Frontend Field | Notes |
|---------|---------------|----------------|-------|
| Draft Order Number | `transactionNo` | `formData.transactionNo` | Used in forms; preserved on update |
| Invoice Number (After Approve) | `transactionNumber` | `so.transactionNumber` | Displayed in approved invoice view |
| Order Status | `status` | `formData.status` | DRAFT → APPROVED workflow |
| Display Text (DRAFT) | `transactionNo` | Placeholder or editable | Shows order number |
| Display Text (APPROVED) | Combined | `orderNumber • INV:transactionNumber` | Shows both in invoice view |

---

## Key Points

✅ **Frontend now works correctly:**
- Placeholder shown in Auto mode until save
- Sequence number fetched ONLY when saving
- No wasted numbers from cancelled forms or multiple opens
- Sequential continuity guaranteed (00001, 00002, 00003...)

⚠️ **Backend MUST:**
- Increment counter ONLY when endpoint is called (frontend calls ONLY during save)
- Use atomic operations to prevent duplicate numbers in high concurrency
- Return numbers in exact format: `POYYYYMM-NNNNN` or `SOYYYYMM-NNNNN`

---

## Checklist for Backend Dev

- [ ] Create `TransactionSequence` table or equivalent
- [ ] Add `/api/v1/transactions/next-number` GET endpoint
- [ ] Validate `type` query parameter
- [ ] **CRITICAL**: Increment counter ONLY when called
- [ ] Generate numbers in `POYYYYMM-NNNNN` / `SOYYYYMM-NNNNN` format
- [ ] Return success JSON with `data.next` field
- [ ] Handle 400 (invalid type) and 500 (generation failure) errors
- [ ] Test endpoint with both `type=purchase_order` and `type=sales_order`
- [ ] Verify sequences increment correctly per year/month
- [ ] Add unit/integration tests
- [ ] Document in API docs or Swagger/OpenAPI
- [ ] **CRITICAL**: Test that counter increments exactly once per fetch
- [ ] Load test: verify no duplicate numbers under concurrent requests (use DB locks)
