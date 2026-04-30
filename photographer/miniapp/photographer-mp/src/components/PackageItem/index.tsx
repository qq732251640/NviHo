import { View, Text } from '@tarojs/components';

import { Package } from '@/types';
import { fmtPrice } from '@/api/client';
import './index.scss';

interface Props {
  data: Package;
  active?: boolean;
  onClick?: () => void;
}

export default function PackageItem({ data, active, onClick }: Props) {
  return (
    <View
      className={`package-item ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <View className="header">
        <Text className="name">{data.name}</Text>
        {data.category && (
          <Text className="category">#{data.category.name}</Text>
        )}
      </View>
      <View className="meta-row">
        <Text className="meta">{data.duration_hours} 小时</Text>
        <Text className="meta">精修 {data.photos_count} 张</Text>
      </View>
      {data.description && (
        <View className="desc">{data.description}</View>
      )}
      <View className="footer">
        <Text className="price">{fmtPrice(data.price)}</Text>
      </View>
    </View>
  );
}
