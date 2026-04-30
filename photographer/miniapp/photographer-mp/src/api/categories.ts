import { request } from './client';
import { Category } from '@/types';

export const listCategories = () => request<Category[]>({ url: '/categories' });
