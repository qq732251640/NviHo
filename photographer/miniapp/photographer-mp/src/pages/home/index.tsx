import { useEffect, useState } from 'react';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';

import { Category, PhotographerListItem, SortBy } from '@/types';
import { listCategories } from '@/api/categories';
import { listPhotographers } from '@/api/photographers';
import PhotographerCard from '@/components/PhotographerCard';
import Empty from '@/components/Empty';
import './index.scss';

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'hot', label: '热门' },
  { key: 'rating', label: '好评' },
  { key: 'price_asc', label: '低价' },
  { key: 'new', label: '新人' },
];

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('hot');
  const [photographers, setPhotographers] = useState<PhotographerListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCategories = async () => {
    try {
      const cats = await listCategories();
      setCategories(cats);
    } catch (e) {}
  };

  const loadPhotographers = async () => {
    setLoading(true);
    try {
      const res = await listPhotographers({
        category_id: activeCategory ?? undefined,
        sort_by: sortBy,
        page_size: 20,
      });
      setPhotographers(res.items);
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadPhotographers();
  }, [activeCategory, sortBy]);

  useDidShow(() => {
    loadPhotographers();
  });

  usePullDownRefresh(async () => {
    await loadPhotographers();
    Taro.stopPullDownRefresh();
  });

  return (
    <View className="home-page">
      <View className="hero">
        <View className="hero-title">挑摄影师 · 太原</View>
        <View className="hero-sub">作品 · 价位 · 档期 · 一目了然</View>
      </View>

      <ScrollView scrollX className="category-bar" showScrollbar={false}>
        <View className="category-list">
          <View
            className={`category-item ${activeCategory === null ? 'active' : ''}`}
            onClick={() => setActiveCategory(null)}
          >
            <Text className="cat-icon">✨</Text>
            <Text className="cat-name">推荐</Text>
          </View>
          {categories.map((c) => (
            <View
              key={c.id}
              className={`category-item ${activeCategory === c.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(c.id)}
            >
              <Text className="cat-icon">{c.icon}</Text>
              <Text className="cat-name">{c.name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="sort-bar">
        {SORT_OPTIONS.map((opt) => (
          <View
            key={opt.key}
            className={`sort-item ${sortBy === opt.key ? 'active' : ''}`}
            onClick={() => setSortBy(opt.key)}
          >
            {opt.label}
          </View>
        ))}
      </View>

      <View className="photographer-list">
        {photographers.length === 0 && !loading ? (
          <Empty text="暂无符合条件的摄影师" />
        ) : (
          photographers.map((p) => <PhotographerCard key={p.id} data={p} />)
        )}
      </View>
    </View>
  );
}
