import { useEffect, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View } from '@tarojs/components';

import { PhotographerListItem, SortBy } from '@/types';
import { listPhotographers } from '@/api/photographers';
import PhotographerCard from '@/components/PhotographerCard';
import Empty from '@/components/Empty';
import './index.scss';

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'hot', label: '综合' },
  { key: 'rating', label: '好评' },
  { key: 'price_asc', label: '低价' },
  { key: 'price_desc', label: '高价' },
];

export default function PhotographerListPage() {
  const router = useRouter();
  const categoryId = router.params.category_id ? Number(router.params.category_id) : null;

  const [items, setItems] = useState<PhotographerListItem[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('hot');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listPhotographers({
        category_id: categoryId ?? undefined,
        sort_by: sortBy,
      });
      setItems(res.items);
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [categoryId, sortBy]);

  return (
    <View className="list-page">
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
      <View className="list">
        {items.length === 0 && !loading ? (
          <Empty />
        ) : (
          items.map((p) => (
            <PhotographerCard
              key={p.id}
              data={p}
              onFavChange={(id, favorited) =>
                setItems((arr) =>
                  arr.map((it) => (it.id === id ? { ...it, is_favorited: favorited } : it))
                )
              }
            />
          ))
        )}
      </View>
    </View>
  );
}
