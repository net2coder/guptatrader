import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Get GST rate as decimal (e.g., 0.18 for 18%)
 * Fetches from Admin Settings, defaults to 18%
 * 
 * @param taxRateFromSettings - Tax rate from store settings as string (e.g., '18')
 * @returns GST rate as decimal (e.g., 0.18)
 */
export function getGstRate(taxRateFromSettings?: string | null): number {
  if (!taxRateFromSettings) return 0.18; // Default to 18%
  const rate = parseFloat(taxRateFromSettings);
  return isNaN(rate) ? 0.18 : rate / 100;
}

/**
 * Get GST percentage for display (e.g., 18 for 18%)
 * 
 * @param taxRateFromSettings - Tax rate from store settings as string (e.g., '18')
 * @returns GST percentage (e.g., 18)
 */
export function getGstPercentage(taxRateFromSettings?: string | null): number {
  if (!taxRateFromSettings) return 18; // Default to 18%
  const rate = parseFloat(taxRateFromSettings);
  return isNaN(rate) ? 18 : rate;
}

/**
 * DEPRECATED: Legacy function kept for backward compatibility
 * Calculate GST-exclusive (base) price from GST-inclusive price
 */
export function calculateBasePrice(gstInclusivePrice: number): number {
  return Math.round((gstInclusivePrice / 1.18) * 100) / 100;
}

/**
 * DEPRECATED: Legacy function kept for backward compatibility
 * Calculate GST-inclusive price from GST-exclusive base price
 */
export function calculateGstInclusivePrice(basePrice: number): number {
  return Math.round(basePrice * 1.18 * 100) / 100;
}

/**
 * DEPRECATED: Legacy function kept for backward compatibility
 * Calculate GST amount from base price
 */
export function calculateGstAmount(basePrice: number): number {
  return Math.round(basePrice * 0.18 * 100) / 100;
}

/**
 * DEPRECATED: Legacy function kept for backward compatibility
 * Extract GST amount from GST-inclusive price
 */
export function extractGstAmount(gstInclusivePrice: number): number {
  const basePrice = calculateBasePrice(gstInclusivePrice);
  return Math.round((gstInclusivePrice - basePrice) * 100) / 100;
}

/**
 * DEPRECATED: Legacy interface for backward compatibility
 * Get pricing breakdown for display
 */
export interface PricingBreakdown {
  basePrice: number;
  gstAmount: number;
  totalPrice: number;
}

/**
 * DEPRECATED: Legacy function for backward compatibility
 */
export function getPricingBreakdown(gstInclusivePrice: number): PricingBreakdown {
  const basePrice = calculateBasePrice(gstInclusivePrice);
  const gstAmount = calculateGstAmount(basePrice);
  return {
    basePrice,
    gstAmount,
    totalPrice: gstInclusivePrice,
  };
}

/**
 * Format price with GST information for display
 * Example: ₹5,000 (includes 18% GST)
 * 
 * @param price - The display price (which includes GST)
 * @param gstPercentage - GST percentage from Admin Settings
 * @returns Formatted string with GST info
 */
export function formatPriceWithGst(price: number, gstPercentage?: number): string {
  const gst = gstPercentage || 18;
  return `${formatPrice(price)} (includes ${gst}% GST)`;
}

/**
 * Store settings for shipping configuration
 */
export interface ShippingSettings {
  free_shipping_threshold: number;
  distance_free_radius: number;
  shipping_per_km_rate: number;
  base_shipping_rate: number;
}

/**
 * Shipping zone type with all required properties
 * NOTE: base_rate has been removed - shipping is calculated only on distance after threshold check
 */
export interface ShippingZone {
  id?: string;
  name?: string;
  free_shipping_threshold: number | null;
  distance_free_radius?: number;
  per_km_rate?: number;
  max_shipping_distance?: number;
  is_active: boolean;
}

/**
 * Detailed shipping breakdown for order display
 * NOTE: base_rate removed - only distance-based charges apply
 */
export interface ShippingBreakdown {
  distance_km: number;
  distance_free_radius: number;
  distance_charged: number;
  per_km_rate: number;
  distance_charge: number;
  is_free_shipping: boolean;
  order_value: number;
  free_shipping_threshold: number;
  total_shipping_charge: number;
}

/**
 * Calculate shipping amount with distance-based logic
 * Uses dynamic thresholds from admin-configured shipping zones
 * 
 * Rules:
 * 1. If order value >= free_shipping_threshold:
 *    - Distance <= distance_free_radius: FREE SHIPPING (₹0)
 *    - Distance > distance_free_radius: Charge = (distance - free_radius) × per_km_rate
 * 2. If order value < free_shipping_threshold:
 *    - Shipping = base_rate (if distance <= free_radius)
 *    - Shipping = base_rate + (distance - free_radius) × per_km_rate (if distance > free_radius)
 * 
 * @param cartTotal - The subtotal of the cart
 * @param distance - Delivery distance in kilometers (default: 0)
 * @param shippingZones - Array of shipping zones from admin settings
 * @returns Object with shipping amount and breakdown details
 */
export function calculateShippingAmount(
  cartTotal: number,
  distance: number = 0,
  shippingZones?: ShippingZone[]
): { amount: number; breakdown: ShippingBreakdown | null } {
  // Default settings (hardcoded fallback if no zone exists)
  const defaults: ShippingSettings = {
    free_shipping_threshold: 10000,
    distance_free_radius: 5,
    shipping_per_km_rate: 50,
    base_shipping_rate: 500,
  };

  // Use defaults as starting point
  let settings: ShippingSettings = defaults;

  // Override with active shipping zone values from admin settings
  if (shippingZones && shippingZones.length > 0) {
    const activeZone = shippingZones.find(zone => zone.is_active);
    if (activeZone) {
      settings = {
        free_shipping_threshold: activeZone.free_shipping_threshold ?? defaults.free_shipping_threshold,
        distance_free_radius: activeZone.distance_free_radius ?? defaults.distance_free_radius,
        shipping_per_km_rate: activeZone.per_km_rate ?? defaults.shipping_per_km_rate,
        base_shipping_rate: activeZone.base_rate ?? defaults.base_shipping_rate,
      };
    }
  }

  // Ensure distance doesn't exceed max_shipping_distance if set
  let actualDistance = distance;
  if (shippingZones && shippingZones.length > 0) {
    const activeZone = shippingZones.find(zone => zone.is_active);
    if (activeZone && activeZone.max_shipping_distance) {
      actualDistance = Math.min(distance, activeZone.max_shipping_distance);
    }
  }

  let totalShippingCharge = 0;
  let distanceCharge = 0;
  const distanceCharged = Math.max(0, actualDistance - settings.distance_free_radius);

  // CASE 1: Free shipping threshold is configured (greater than 0)
  if (settings.free_shipping_threshold && settings.free_shipping_threshold > 0) {
    if (cartTotal >= settings.free_shipping_threshold) {
      // Order meets threshold: free delivery within distance_free_radius
      if (actualDistance <= settings.distance_free_radius) {
        totalShippingCharge = 0;
        distanceCharge = 0;
      } else {
        // Beyond free radius: charge per km
        distanceCharge = distanceCharged * settings.shipping_per_km_rate;
        totalShippingCharge = distanceCharge;
      }
    } else {
      // CASE 2: Order value < free shipping threshold
      // Always apply base rate, plus distance charge if beyond free radius
      totalShippingCharge = settings.base_shipping_rate;

      if (actualDistance > settings.distance_free_radius) {
        distanceCharge = distanceCharged * settings.shipping_per_km_rate;
        totalShippingCharge += distanceCharge;
      }
    }
  } else {
    // CASE 3: No free shipping threshold configured (backward compatibility)
    // Always charge base rate + distance charge
    totalShippingCharge = settings.base_shipping_rate;

    if (actualDistance > settings.distance_free_radius) {
      distanceCharge = distanceCharged * settings.shipping_per_km_rate;
      totalShippingCharge += distanceCharge;
    }
  }

  const breakdown: ShippingBreakdown = {
    base_rate: settings.base_shipping_rate,
    distance_km: actualDistance,
    distance_free_radius: settings.distance_free_radius,
    distance_charged: distanceCharged,
    per_km_rate: settings.shipping_per_km_rate,
    distance_charge: distanceCharge,
    is_free_shipping: cartTotal >= settings.free_shipping_threshold && actualDistance <= settings.distance_free_radius,
    order_value: cartTotal,
    free_shipping_threshold: settings.free_shipping_threshold,
    total_shipping_charge: totalShippingCharge,
  };

  return {
    amount: totalShippingCharge,
    breakdown,
  };
}

/**
 * Legacy wrapper for backward compatibility
 * Returns just the shipping amount (number)
 * Used in components that haven't been updated yet
 */
export function calculateShippingAmountLegacy(
  cartTotal: number,
  shippingZones?: ShippingZone[],
  shippingSettings?: ShippingSettings
): number {
  const result = calculateShippingAmount(cartTotal, 0, shippingZones, shippingSettings);
  return result.amount;
}
