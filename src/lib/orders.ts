import { requireSupabase } from './supabase'

export type CartLine = { productId: string; quantity: number }
export type CheckoutDetails = {
  name: string
  phone: string
  email?: string
  notes?: string
  fulfillment?: 'pickup' | 'delivery'
  deliveryAddress?: string
  promotionCode?: string
}

export function validateCheckout(details: CheckoutDetails) {
  if (details.name.trim().length < 2) throw new Error('Please enter your name.')
  if (!/^[6-9]\d{9}$/.test(details.phone.replace(/\D/g, '').slice(-10))) {
    throw new Error('Enter a valid 10-digit Indian mobile number.')
  }
  if (details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
    throw new Error('Enter a valid email address.')
  }
  if (details.notes && details.notes.length > 500) throw new Error('Order notes must be 500 characters or fewer.')
  if (details.fulfillment === 'delivery' && (details.deliveryAddress?.trim().length ?? 0) < 8) {
    throw new Error('Enter a complete delivery address.')
  }
  return { ...details, name: details.name.trim(), phone: details.phone.replace(/\D/g, '').slice(-10) }
}

export async function createOrder(details: CheckoutDetails, items: CartLine[]) {
  const customer = validateCheckout(details)
  if (!items.length || items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
    throw new Error('Your cart has invalid items. Please review it and try again.')
  }
  const client = requireSupabase()
  const { data, error } = await client.rpc('create_customer_order', {
    p_customer_name: customer.name,
    p_customer_phone: customer.phone,
    p_customer_email: customer.email?.trim() || null,
    p_notes: customer.notes?.trim() || null,
    p_items: items.map(({ productId, quantity }) => ({ product_id: productId, quantity })),
    p_fulfillment: customer.fulfillment || 'pickup',
    p_delivery_address: customer.fulfillment === 'delivery' ? customer.deliveryAddress?.trim() : null,
    p_promotion_code: customer.promotionCode?.trim() || null,
  })
  if (error) throw new Error(error.message || 'We could not place your order. Please try again.')
  if (!data || typeof data.order_number !== 'string' || typeof data.total !== 'number') {
    throw new Error('The order service returned an invalid confirmation.')
  }
  return data as { order_number: string; total: number; subtotal: number; tax: number; fee: number; discount: number }
}

export async function fetchOrder(orderNumber: string, phone: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('get_customer_order', {
    p_order_number: orderNumber.trim(),
    p_customer_phone: phone.replace(/\D/g, '').slice(-10),
  })
  if (error) throw new Error(error.message || 'We could not find that order.')
  return data as { order_number: string; status: string; created_at: string } | null
}
