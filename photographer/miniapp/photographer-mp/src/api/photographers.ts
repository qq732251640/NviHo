import { request } from './client';
import {
  Page,
  PhotographerDetail,
  PhotographerListItem,
  ScheduleItem,
  SortBy,
} from '@/types';

export interface ListPhotographersParams {
  category_id?: number;
  city?: string;
  sort_by?: SortBy;
  price_min?: number;
  price_max?: number;
  page?: number;
  page_size?: number;
}

const buildQuery = (params: Record<string, any>) => {
  const parts: string[] = [];
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  });
  return parts.length ? `?${parts.join('&')}` : '';
};

export const listPhotographers = (params: ListPhotographersParams = {}) =>
  request<Page<PhotographerListItem>>({ url: `/photographers${buildQuery(params)}` });

export const getPhotographer = (id: number) =>
  request<PhotographerDetail>({ url: `/photographers/${id}` });

export const getSchedule = (id: number, month: string) =>
  request<ScheduleItem[]>({ url: `/photographers/${id}/schedule?month=${month}` });

export const toggleFavorite = (id: number) =>
  request<{ ok: boolean; favorited: boolean; message?: string }>({
    url: `/photographers/${id}/favorite`,
    method: 'POST',
  });

export const myFavorites = () =>
  request<PhotographerListItem[]>({ url: '/photographers/me/favorites' });
