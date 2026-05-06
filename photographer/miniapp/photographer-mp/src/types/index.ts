export interface Category {
  id: number;
  code: string;
  name: string;
  icon?: string;
  sort?: number;
}

export interface PhotographerListItem {
  id: number;
  nickname: string;
  avatar?: string;
  cover_image?: string;
  intro?: string;
  base_city?: string;
  avg_rating: number;
  review_count: number;
  completed_orders: number;
  starting_price: number;
  hot_score?: number;
  categories: Category[];
}

export interface Work {
  id: number;
  image_url: string;
  thumb_url?: string;
  title?: string;
  is_cover?: number;
  sort?: number;
  shoot_date?: string;
  category?: Category;
}

export interface Package {
  id: number;
  name: string;
  duration_hours: number;
  photos_count: number;
  description?: string;
  price: number;
  is_active?: number;
  category?: Category;
}

export interface ReviewItem {
  id: number;
  rating: number;
  text?: string;
  tags?: string;
  images?: string;
  created_at: string;
  user_nickname?: string;
  user_avatar?: string;
}

export interface PhotographerDetail extends PhotographerListItem {
  years_of_experience?: number;
  service_radius_km?: number;
  service_extra_fee?: number;
  external_portfolio_url?: string;
  works: Work[];
  packages: Package[];
  recent_reviews: ReviewItem[];
}

export interface ScheduleItem {
  date: string;
  status: 'free' | 'partial' | 'busy' | 'blocked';
  price_adjust?: number;
  note?: string;
}

export interface OrderListItem {
  id: number;
  order_no: string;
  photographer_id: number;
  photographer_nickname?: string;
  photographer_avatar?: string;
  package_name?: string;
  shoot_date: string;
  location: string;
  amount_total: number;
  status: string;
  created_at: string;
}

export interface OrderDetail extends OrderListItem {
  user_id: number;
  user_nickname?: string;
  package_id: number;
  package_description?: string;
  requirements?: string;
  contact_name?: string;
  contact_phone?: string;
  photographer_phone?: string;
  commission: number;
  commission_rate: number;
  reject_reason?: string;

  // 交付信息
  delivery_preview_images?: string[];
  delivery_url?: string;       // 用户视角:确认收片后才有
  delivery_password?: string;  // 用户视角:确认收片后才有
  delivery_note?: string;
  delivery_at?: string;
  delivery_unlocked?: boolean; // 是否已经解锁(展示链接)

  paid_at?: string;
  accepted_at?: string;
  completed_at?: string;
  confirmed_at?: string;
  settled_at?: string;
}

export interface AgreementContent {
  type: 'user' | 'photographer' | 'service_commitment';
  title: string;
  version: string;
  content_md: string;
  effective_date: string;
}

export interface UserInfo {
  id: number;
  username: string;
  nickname?: string;
  avatar?: string;
  pm_role: 'user' | 'photographer' | 'both' | 'admin';
  pm_phone?: string;
  pm_city?: string;
  photographer_id?: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type SortBy = 'hot' | 'rating' | 'price_asc' | 'price_desc' | 'new';
