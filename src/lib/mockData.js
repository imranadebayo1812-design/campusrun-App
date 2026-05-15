export const MOCK_USER = {
  id: 'user-1',
  email: 'imran@nileuniversity.edu.ng',
};

export const MOCK_PROFILE = {
  id: 'user-1',
  email: 'imran@nileuniversity.edu.ng',
  full_name: 'Imran Adebayo',
  phone_number: '08012345678',
  course: 'Computer Science',
  campus_status: 'resident',
  hostel: 'Nile Hall A',
  terms_accepted: true,
  onboarding_complete: true,
  is_admin: true,
  is_courier: true,
  is_blacklisted: false,
  wallet_balance: 15000,
  total_earnings: 8500,
  pro_subscriber: false,
};

export const MOCK_ORDERS = [
  {
    id: 'order-1',
    buyer_id: 'user-1',
    order_type: 'purchase',
    pickup_location: 'Food Court',
    dropoff_location: 'Nile Hall A',
    status: 'on_the_way',
    items: [{ name: 'Jollof Rice', qty: 1, price: '1500' }, { name: 'Chicken', qty: 1, price: '800' }],
    food_cost: 2300,
    delivery_fee: 300,
    service_fee: 100,
    total_amount: 2700,
    delivery_code: '4782',
    courier_name: 'Ahmed Musa',
    courier_accepted: true,
    special_instructions: null,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'order-2',
    buyer_id: 'user-1',
    order_type: 'errand',
    pickup_location: 'Admin Block',
    dropoff_location: 'Nile Hall B',
    status: 'delivered',
    items: [],
    item_description: 'Course registration form',
    food_cost: 0,
    delivery_fee: 400,
    service_fee: 100,
    total_amount: 500,
    delivery_code: '1234',
    courier_name: 'Fatima Ibrahim',
    courier_accepted: true,
    special_instructions: null,
    delivered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'order-3',
    buyer_id: 'user-1',
    order_type: 'purchase',
    pickup_location: 'Female Shopping Complex',
    dropoff_location: 'Nile Hall C',
    status: 'placed',
    items: [{ name: 'Chicken Shawarma', qty: 2, price: '1200' }],
    food_cost: 2400,
    delivery_fee: 300,
    service_fee: 100,
    total_amount: 2800,
    delivery_code: '5619',
    courier_name: null,
    courier_accepted: false,
    special_instructions: 'Extra sauce please',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
];

export const MOCK_TRANSACTIONS = [
  {
    id: 'tx-1',
    user_id: 'user-1',
    type: 'topup',
    amount: 20000,
    balance_after: 15000,
    description: 'Wallet top up',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx-2',
    user_id: 'user-1',
    type: 'payment',
    amount: 2700,
    balance_after: 12300,
    description: 'Delivery payment — Food Court',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx-3',
    user_id: 'user-1',
    type: 'payment',
    amount: 500,
    balance_after: 14700,
    description: 'Delivery payment — Admin Block',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx-4',
    user_id: 'user-1',
    type: 'earning',
    amount: 8500,
    balance_after: 15200,
    description: 'Courier earnings',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_COURIER_NOTIFICATIONS = [
  {
    id: 'notif-1',
    courier_id: 'user-1',
    responded: false,
    gate_only: false,
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    deliveries: {
      id: 'order-pending-1',
      order_type: 'purchase',
      pickup_location: 'Food Court',
      dropoff_location: 'Nile Hall D',
      delivery_fee: 300,
      food_cost: 2000,
      items: [{ name: 'Fried Rice + Chicken', qty: 1, price: '2000' }],
      special_instructions: 'Please add extra plantain',
    },
  },
  {
    id: 'notif-2',
    courier_id: 'user-1',
    responded: false,
    gate_only: true,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    deliveries: {
      id: 'order-pending-2',
      order_type: 'errand',
      pickup_location: 'Main Gate',
      dropoff_location: 'Library',
      delivery_fee: 500,
      food_cost: 0,
      items: [],
      special_instructions: null,
    },
  },
];

export const MOCK_ACTIVE_DELIVERY = {
  id: 'order-1',
  order_type: 'purchase',
  pickup_location: 'Food Court',
  dropoff_location: 'Nile Hall A',
  status: 'on_the_way',
  items: [{ name: 'Jollof Rice', qty: 1, price: '1500' }, { name: 'Chicken', qty: 1, price: '800' }],
  food_cost: 2300,
  delivery_fee: 300,
  service_fee: 100,
  total_amount: 2700,
  delivery_code: '4782',
  buyer_id: 'buyer-2',
  courier_id: 'user-1',
  special_instructions: null,
  payment_verified: true,
  created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
};

export const MOCK_EARNINGS = {
  today: 1800,
  this_week: 8500,
  total: 24500,
  deliveries_today: 3,
  deliveries_week: 14,
};

export const MOCK_EARNING_HISTORY = [
  { id: 'e-1', pickup_location: 'Food Court', dropoff_location: 'Nile Hall A', delivery_fee: 300, food_cost: 2300, created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
  { id: 'e-2', pickup_location: 'Female Shopping Complex', dropoff_location: 'Back Gate', delivery_fee: 400, food_cost: 0, created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  { id: 'e-3', pickup_location: 'Student Center', dropoff_location: 'Nile Hall C', delivery_fee: 300, food_cost: 1500, created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  { id: 'e-4', pickup_location: 'Main Gate', dropoff_location: 'Sports Complex', delivery_fee: 500, food_cost: 0, created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() },
];

// ─── Admin mock data ──────────────────────────────────────────────────────────

export const MOCK_ADMIN_STATS = {
  active_orders: 12,
  delivered_today: 47,
  cancelled_today: 3,
  total_users: 342,
  online_users: 28,
};

export const MOCK_REVENUE = {
  platform_total: 185400,
  tips_paid: 24300,
  pro_subscriptions: { count: 89, monthly_revenue: 22250 },
  commission: 18540,
  service_fee_income: 142110,
};

export const MOCK_ORDERS_CHART = [
  { day: 'Mon', orders: 23 },
  { day: 'Tue', orders: 31 },
  { day: 'Wed', orders: 28 },
  { day: 'Thu', orders: 45 },
  { day: 'Fri', orders: 52 },
  { day: 'Sat', orders: 38 },
  { day: 'Sun', orders: 19 },
];

export const MOCK_REVENUE_CHART = [
  { day: 'Mon', revenue: 15400 },
  { day: 'Tue', revenue: 21300 },
  { day: 'Wed', revenue: 18700 },
  { day: 'Thu', revenue: 29500 },
  { day: 'Fri', revenue: 34200 },
  { day: 'Sat', revenue: 25100 },
  { day: 'Sun', revenue: 12800 },
];

export const MOCK_ADMIN_ORDERS = [
  { id: 'ao-1', buyer_name: 'Imran Adebayo', pickup_location: 'Food Court', dropoff_location: 'Nile Hall A', total_amount: 2700, status: 'on_the_way', order_type: 'purchase', created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: 'ao-2', buyer_name: 'Aisha Bello', pickup_location: 'Female Shopping Complex', dropoff_location: 'Victoria Falls', total_amount: 1800, status: 'placed', order_type: 'purchase', created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 'ao-3', buyer_name: 'Chidi Okonkwo', pickup_location: 'Admin Block', dropoff_location: 'Nile Hall B', total_amount: 500, status: 'delivered', order_type: 'errand', created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  { id: 'ao-4', buyer_name: 'Fatima Usman', pickup_location: 'Student Center', dropoff_location: 'Moat Heaven', total_amount: 3200, status: 'bought', order_type: 'purchase', created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
  { id: 'ao-5', buyer_name: 'Emeka Nwosu', pickup_location: 'Main Gate', dropoff_location: 'Library', total_amount: 700, status: 'cancelled', order_type: 'errand', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 'ao-6', buyer_name: 'Zainab Abdullahi', pickup_location: 'Food Court', dropoff_location: 'Nile Hall C', total_amount: 1900, status: 'arrived', order_type: 'purchase', created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
  { id: 'ao-7', buyer_name: 'Tunde Okafor', pickup_location: 'Female Shopping Complex', dropoff_location: 'Nile Hall D', total_amount: 2100, status: 'flagged', order_type: 'purchase', created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString() },
  { id: 'ao-8', buyer_name: 'Ngozi Eze', pickup_location: 'Car Park', dropoff_location: 'Victoria Falls', total_amount: 600, status: 'delivered', order_type: 'errand', created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
];

export const MOCK_ADMIN_USERS = [
  { id: 'u-1', full_name: 'Imran Adebayo', email: 'imran@nileuniversity.edu.ng', campus_status: 'resident', hostel: 'Nile Hall A', orders_count: 12, wallet_balance: 15000, fraud_score: 0, is_blacklisted: false, is_courier: true, pro_subscriber: false },
  { id: 'u-2', full_name: 'Aisha Bello', email: 'aisha@nileuniversity.edu.ng', campus_status: 'resident', hostel: 'Victoria Falls', orders_count: 8, wallet_balance: 8500, fraud_score: 0, is_blacklisted: false, is_courier: false, pro_subscriber: true },
  { id: 'u-3', full_name: 'Chidi Okonkwo', email: 'chidi@nileuniversity.edu.ng', campus_status: 'day_student', hostel: null, orders_count: 5, wallet_balance: 3200, fraud_score: 1, is_blacklisted: false, is_courier: false, pro_subscriber: false },
  { id: 'u-4', full_name: 'Fatima Usman', email: 'fatima@nileuniversity.edu.ng', campus_status: 'resident', hostel: 'Moat Heaven', orders_count: 21, wallet_balance: 22000, fraud_score: 0, is_blacklisted: false, is_courier: true, pro_subscriber: true },
  { id: 'u-5', full_name: 'Emeka Nwosu', email: 'emeka@nileuniversity.edu.ng', campus_status: 'resident', hostel: 'Nile Hall B', orders_count: 3, wallet_balance: 500, fraud_score: 3, is_blacklisted: true, is_courier: false, pro_subscriber: false },
  { id: 'u-6', full_name: 'Zainab Abdullahi', email: 'zainab@nileuniversity.edu.ng', campus_status: 'resident', hostel: 'Nile Hall C', orders_count: 15, wallet_balance: 11000, fraud_score: 0, is_blacklisted: false, is_courier: false, pro_subscriber: true },
  { id: 'u-7', full_name: 'Tunde Okafor', email: 'tunde@nileuniversity.edu.ng', campus_status: 'day_student', hostel: null, orders_count: 7, wallet_balance: 4700, fraud_score: 2, is_blacklisted: false, is_courier: true, pro_subscriber: false },
  { id: 'u-8', full_name: 'Ngozi Eze', email: 'ngozi@nileuniversity.edu.ng', campus_status: 'resident', hostel: 'Victoria Falls', orders_count: 19, wallet_balance: 18300, fraud_score: 0, is_blacklisted: false, is_courier: false, pro_subscriber: true },
];

export const MOCK_RUNNERS = [
  { id: 'r-1', full_name: 'Ahmed Musa', phone: '08022334455', status: 'online', orders_today: 6, rating: 4.9, earnings_today: 2400, is_active: true },
  { id: 'r-2', full_name: 'Halima Sani', phone: '08033445566', status: 'online', orders_today: 4, rating: 4.7, earnings_today: 1800, is_active: true },
  { id: 'r-3', full_name: 'Daniel Obi', phone: '08044556677', status: 'offline', orders_today: 2, rating: 4.5, earnings_today: 700, is_active: true },
  { id: 'r-4', full_name: 'Mariam Yusuf', phone: '08055667788', status: 'online', orders_today: 8, rating: 5.0, earnings_today: 3200, is_active: true },
  { id: 'r-5', full_name: 'Biodun Adewale', phone: '08066778899', status: 'offline', orders_today: 0, rating: 4.2, earnings_today: 0, is_active: false },
];
