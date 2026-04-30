import { View, Text } from '@tarojs/components';

import { Category } from '@/types';
import './index.scss';

interface Props {
  visible: boolean;
  categories: Category[];
  current: number | null;
  onPick: (id: number | null) => void;
  onClose: () => void;
  title?: string;
}

export default function CategoryDrawer({
  visible,
  categories,
  current,
  onPick,
  onClose,
  title = '作品',
}: Props) {
  if (!visible) return null;

  const handlePick = (id: number | null) => {
    onPick(id);
    onClose();
  };

  return (
    <View className="category-drawer-mask" onClick={onClose}>
      <View
        className="category-drawer"
        onClick={(e: any) => e.stopPropagation && e.stopPropagation()}
        catchMove
      >
        <View className="drawer-header">
          <Text className="drawer-title">{title}</Text>
        </View>
        <View
          className={`drawer-item ${current === null ? 'active' : ''}`}
          onClick={() => handlePick(null)}
        >
          <View className="dot" />
          <Text className="label">全部</Text>
        </View>
        {categories.map((c) => (
          <View
            key={c.id}
            className={`drawer-item ${current === c.id ? 'active' : ''}`}
            onClick={() => handlePick(c.id)}
          >
            <View className="dot" />
            <Text className="label">{c.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
