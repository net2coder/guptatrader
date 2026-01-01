# Distance-Based Shipping Implementation - Complete Guide

## ✅ Implementation Summary

Successfully updated the shipping logic to support **distance-based calculations with free delivery radius**. The system now intelligently applies shipping charges based on order value, delivery distance, and admin-configured rates.

---

## 🔄 New Shipping Logic

### Rule 1: Order Value >= Free Shipping Threshold
```
if order_value >= free_shipping_threshold:
  if distance <= distance_free_radius (5km):
    shipping = ₹0 (FREE)
  else:
    excess_distance = distance - distance_free_radius
    shipping = excess_distance × per_km_rate
```

### Rule 2: Order Value < Free Shipping Threshold
```
if order_value < free_shipping_threshold:
  base_shipping = base_rate
  if distance > distance_free_radius:
    distance_charge = (distance - distance_free_radius) × per_km_rate
    shipping = base_shipping + distance_charge
  else:
    shipping = base_shipping
```

---

## 📊 Updated Schema

### New Columns in `shipping_zones` Table
| Column | Type | Purpose | Example |
|--------|------|---------|---------|
| `distance_free_radius` | numeric | Free delivery radius (km) | `5` |
| `per_km_rate` | numeric | Rupees per km for excess distance | `50` |
| `max_shipping_distance` | numeric | Maximum deliverable distance (optional) | `100` |
| `updated_at` | timestamp | Trigger update timestamp | auto |

### New Columns in `orders` Table
| Column | Type | Purpose |
|--------|------|---------|
| `delivery_distance` | numeric | Distance in km from store to address |
| `shipping_breakdown` | jsonb | Detailed shipping calculation breakdown |

---

## 💾 Database Migration

**File**: `docs/20250101-add-distance-based-shipping.sql`

Execute this SQL file on Supabase to:
✓ Add new columns to `shipping_zones`
✓ Add new columns to `orders`
✓ Create/update triggers for `updated_at`
✓ Add documentation comments

---

## 🔧 Updated Components

### 1. **Utility Function** (`src/lib/utils.ts`)
**New Types Added:**
- `ShippingZone` - Typed shipping zone interface
- `ShippingBreakdown` - Detailed breakdown object

**Enhanced Function:**
```typescript
calculateShippingAmount(
  cartTotal: number,
  distance: number = 0,
  shippingZones?: ShippingZone[]
): { amount: number; breakdown: ShippingBreakdown | null }
```

**Features:**
- ✓ Distance-aware calculation
- ✓ Real-time breakdown details
- ✓ Fallback to defaults when no zones configured
- ✓ Distance limiting with `max_shipping_distance`

**Backward Compatible:**
- ✓ Legacy wrapper function `calculateShippingAmountLegacy()` for non-distance components

### 2. **Checkout Page** (`src/pages/CheckoutPage.tsx`)
**New Features:**
- ✓ Distance input field (km with 0.1 precision)
- ✓ Real-time shipping breakdown display
- ✓ Shows free shipping eligibility status
- ✓ Detailed calculation: base rate + distance charge breakdown
- ✓ Visual feedback: color-coded breakdown card
- ✓ Distance information in order summary

**Updates Made:**
- Added `deliveryDistance` state
- Import new utility types (`ShippingBreakdown`, `ShippingZone`)
- Calculate shipping with distance parameter
- Display breakdown with Framer Motion animations
- Pass distance/breakdown to order creation

### 3. **Cart Page** (`src/pages/CartPage.tsx`)
**Updates Made:**
- ✓ Switched to legacy wrapper function (no distance needed on cart)
- ✓ Type safety with `ShippingZone` type
- ✓ Maintains backward compatibility

### 4. **Order Creation Hook** (`src/hooks/useOrders.ts`)
**New Parameters:**
```typescript
{
  deliveryDistance?: number;
  shippingBreakdown?: ShippingBreakdown;
}
```

**Updates Made:**
- ✓ Accept distance from checkout
- ✓ Accept shipping breakdown details
- ✓ Store in order's `delivery_distance` column
- ✓ Store breakdown in `shipping_breakdown` column

---

## 📈 Dynamic Updates Flow

```
Customer Action:
├─ Change distance → Recalculate shipping
├─ Change cart items → Recalculate (via Cart context)
├─ Change coupon → Recalculate total
└─ Admin updates settings → Auto-fetch new zones

Component Flow:
User Input → State Update → useShippingZones Hook
                                    ↓
calculateShippingAmount(total, distance, zones)
                                    ↓
Return { amount, breakdown }
                                    ↓
UI Updates (Total, Breakdown, Free Shipping Status)
```

All updates happen automatically thanks to:
- React state management
- React Query for data fetching
- Reactive calculations

---

## 🎨 UI/UX Features

### Distance Input Card
- Modern card layout with icon
- Number input with step (0.1km)
- Clear placeholder text
- Help text explaining free radius

### Shipping Breakdown Display
- Animated appearance (Framer Motion)
- Shows free shipping status when eligible
- Detailed calculation breakdown:
  - Order value vs threshold
  - Base rate
  - Distance charge calculation
  - Total shipping charge
- Color-coded (blue info card)
- Shows distance in km beyond free radius

### Order Summary
- Displays final shipping amount
- Shows "Free" in green when applicable
- Additional line showing distance charged when applicable

---

## 🔍 Example Scenarios

### Scenario 1: Order >= ₹10,000, Distance 3km
```
Free Shipping Threshold: ₹10,000
Distance Free Radius: 5km
Per KM Rate: ₹50/km

Order Value: ₹15,000 ✓
Distance: 3km ✓
Result: FREE SHIPPING (within free radius)
```

### Scenario 2: Order >= ₹10,000, Distance 8km
```
Order Value: ₹15,000 ✓
Distance: 8km (2km beyond radius)
Excess Distance: 8 - 5 = 3km
Distance Charge: 3km × ₹50/km = ₹150
Result: ₹150 SHIPPING
```

### Scenario 3: Order < ₹10,000, Distance 2km
```
Order Value: ₹8,000 ✗ (need ₹2,000 more for free)
Distance: 2km (within free radius)
Base Rate: ₹500
Result: ₹500 SHIPPING (base rate only)
```

### Scenario 4: Order < ₹10,000, Distance 7km
```
Order Value: ₹8,000 ✗
Distance: 7km (2km beyond free radius)
Base Rate: ₹500
Distance Charge: 2km × ₹50/km = ₹100
Result: ₹600 SHIPPING (base + distance)
```

---

## 🚀 Next Steps

### 1. Run Database Migration
```sql
-- Execute: docs/20250101-add-distance-based-shipping.sql
```

### 2. Test in Development
- [ ] Add items to cart
- [ ] Proceed to checkout
- [ ] Enter different distances (0, 3, 5, 10, 20 km)
- [ ] Verify shipping calculation at each step
- [ ] Check shipping breakdown display
- [ ] Verify order is created with distance/breakdown

### 3. Update Admin Panel (Optional)
If you have admin settings, update shipping zone configuration to include:
- `distance_free_radius` (default: 5)
- `per_km_rate` (default: 50)
- `max_shipping_distance` (optional limit)

### 4. Test Edge Cases
- [ ] Distance = 0 (store pickup)
- [ ] Distance = exactly 5km (at boundary)
- [ ] Very large distance (test max limit)
- [ ] Cart total at exactly threshold
- [ ] Multiple coupon scenarios

---

## 📝 Database Admin Notes

### Query to View Shipping Configuration
```sql
SELECT 
  name,
  base_rate,
  per_kg_rate,
  free_shipping_threshold,
  distance_free_radius,
  per_km_rate,
  max_shipping_distance,
  is_active
FROM shipping_zones
WHERE is_active = true;
```

### Update Admin Shipping Settings
```sql
UPDATE shipping_zones
SET 
  distance_free_radius = 5,
  per_km_rate = 50,
  max_shipping_distance = 100
WHERE name = 'Local' OR is_active = true
LIMIT 1;
```

### View Order Shipping Details
```sql
SELECT 
  id,
  order_number,
  delivery_distance,
  shipping_amount,
  shipping_breakdown
FROM orders
WHERE delivery_distance > 0
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Key Benefits

✅ **Customer-Friendly** - Clear shipping calculation breakdown
✅ **Distance-Aware** - Accurate charges for different delivery areas
✅ **Flexible** - Admins can configure rates easily
✅ **Scalable** - Ready for multi-zone shipping
✅ **Dynamic** - Updates in real-time
✅ **Type-Safe** - Full TypeScript support
✅ **Backward Compatible** - Legacy components still work
✅ **Well-Documented** - Comprehensive data storage

---

## ⚠️ Important Notes

1. **Distance Unit**: All distances are in **kilometers (km)**
2. **Currency**: All rates are in **Indian Rupees (₹)**
3. **Precision**: Distance can be decimal (e.g., 5.5km)
4. **Defaults**: If no zones configured, falls back to ₹10K threshold, ₹500 shipping
5. **Order Storage**: Both `delivery_distance` and `shipping_breakdown` are stored for history

---

## 📞 Support

For issues or questions:
1. Check shipping zone configuration in admin
2. Verify distance_free_radius and per_km_rate are set
3. Test with simple scenarios first
4. Check browser console for errors
5. Verify database migration was successful
